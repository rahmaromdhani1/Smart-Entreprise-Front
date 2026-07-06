import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, TextInput, ActivityIndicator, Animated, Dimensions, FlatList, Modal,
} from 'react-native';
import { DollarSign, AlertTriangle, Zap, TrendingUp, Wifi, WifiOff } from 'lucide-react-native';

// ═══════════════════════════════════════════════════════════════════
// Configuration
// ═══════════════════════════════════════════════════════════════════
const CHART_WIDTH = Dimensions.get('window').width - 72;
const CHART_HEIGHT = 280;
const PADDING = 40;
const API_URL = 'http://172.28.40.165:5000/api';
const BACKM_API_URL = 'http://172.28.40.165:5050/api';
const FLOOR_COLORS = ['#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#EF4444'];
const REQUEST_TIMEOUT_MS = 6000;
const PERIOD_OPTIONS = [
  { key: 'day', label: 'Day', hours: 24, bucket: 'halfHour', subtitle: 'Today · every 30 min' },
  { key: 'week', label: 'Week', hours: 168, bucket: 'day', subtitle: 'Daily average' },
  { key: 'month', label: 'Month', hours: 720, bucket: 'week', subtitle: 'Weekly average' },
];

const ENERGY_DECIMALS = 2;
const MEASURE_KEYS = ['voltage', 'current', 'power', 'frequency', 'power_factor'];
const MEASURE_META = {
  voltage: { label: 'Voltage', unit: 'V', decimals: 1 },
  current: { label: 'Current', unit: 'A', decimals: 2 },
  power: { label: 'Power', unit: 'W', decimals: 1 },
  frequency: { label: 'Frequency', unit: 'Hz', decimals: 1 },
  power_factor: { label: 'Power Factor', unit: '', decimals: 2 },
};

const formatNumber = (value, decimals = 2) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return numeric.toFixed(decimals).replace(/\.?0+$/, '');
};

const formatCost = (value) => formatNumber(value, 4);
const formatCompactNumber = (value, decimals = 1) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  const abs = Math.abs(numeric);

  if (abs >= 1000000) return `${formatNumber(numeric / 1000000, decimals)}M`;
  if (abs >= 1000) return `${formatNumber(numeric / 1000, decimals)}k`;
  if (abs >= 100) return formatNumber(numeric, 0);
  if (abs >= 10) return formatNumber(numeric, 1);
  return formatNumber(numeric, 2);
};
const formatEnergy = (value) => formatCompactNumber(value, 1);
const formatChartEnergy = (value) => formatCompactNumber(value, 1);

const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getPointDate = (point) => {
  const date = point?.timestamp ? new Date(point.timestamp) : new Date();
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const isSameLocalDay = (a, b) => (
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate()
);

const getBucketStart = (date, bucket) => {
  const start = new Date(date);

  if (bucket === 'halfHour') {
    start.setSeconds(0, 0);
    start.setMinutes(start.getMinutes() < 30 ? 0 : 30);
    return start;
  }

  if (bucket === 'week') {
    start.setHours(0, 0, 0, 0);
    const mondayBasedDay = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - mondayBasedDay);
    return start;
  }

  start.setHours(0, 0, 0, 0);
  return start;
};

const formatBucketTime = (date, bucket) => {
  if (bucket === 'halfHour') {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  if (bucket === 'week') {
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${date.toLocaleDateString([], { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString([], { day: '2-digit', month: 'short' })}`;
  }

  return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
};

const average = (values) => {
  const valid = values.filter((value) => Number.isFinite(value));
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};

const getMeasurementValue = (point, key) => {
  const raw = point?.[key]
    ?? point?.metrics?.[key]
    ?? point?.measures?.[key]
    ?? point?.fields?.[key]
    ?? point?.values?.[key];
  if (raw && typeof raw === 'object' && 'value' in raw) return toNumber(raw.value, null);
  if (key === 'power_factor') {
    return toNumber(
      point?.power_factor
        ?? point?.powerFactor
        ?? point?.metrics?.powerFactor
        ?? point?.measures?.powerFactor
        ?? point?.fields?.powerFactor
        ?? point?.values?.powerFactor,
      null
    );
  }
  return toNumber(raw, null);
};

const getEnergyValue = (point) => (
  toNumber(point?.value ?? point?._value ?? point?.energy ?? point?.kwh ?? point?.fields?.energy, null)
);

const aggregatePoints = (points, unit, periodKey) => {
  const period = PERIOD_OPTIONS.find((item) => item.key === periodKey) ?? PERIOD_OPTIONS[0];
  const bucketType = period.bucket;
  const now = new Date();
  const buckets = new Map();

  points.forEach((point, index) => {
    const date = getPointDate(point);
    if (periodKey === 'day' && !isSameLocalDay(date, now)) return;

    const bucketStart = getBucketStart(date, bucketType);
    const bucketKey = bucketStart.toISOString();
    const roomKey = point.room || point.nodeId || point.mac || `source-${index}`;
    const energyValue = getEnergyValue(point);
    if (!Number.isFinite(energyValue)) return;

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        date: bucketStart,
        byRoom: new Map(),
      });
    }

    const bucket = buckets.get(bucketKey);
    if (!bucket.byRoom.has(roomKey)) bucket.byRoom.set(roomKey, []);
    bucket.byRoom.get(roomKey).push({
        _date: date,
        value: energyValue,
        unit: point.unit || unit || 'kWh',
        room: point.room || 'unknown',
        nodeId: point.nodeId || null,
        mac: point.mac || null,
        voltage: getMeasurementValue(point, 'voltage'),
        current: getMeasurementValue(point, 'current'),
        power: getMeasurementValue(point, 'power'),
        frequency: getMeasurementValue(point, 'frequency'),
        power_factor: getMeasurementValue(point, 'power_factor'),
      });
  });

  return Array.from(buckets.entries())
    .map(([bucketKey, bucket], index) => {
      const roomPoints = Array.from(bucket.byRoom.values()).map((roomSamples) => {
        const latest = roomSamples.reduce((best, sample) => (!best || sample._date > best._date ? sample : best), null);
        const energyAverage = average(roomSamples.map((sample) => sample.value));
        const measures = {};

        MEASURE_KEYS.forEach((key) => {
          measures[key] = average(roomSamples.map((sample) => sample[key]));
        });

        return {
          ...latest,
          value: energyAverage,
          ...measures,
        };
      });
      const value = roomPoints.reduce((sum, point) => sum + toNumber(point.value), 0);
      const roomNames = roomPoints.map((point) => point.room).filter(Boolean);
      const firstPoint = roomPoints[0] ?? {};
      const measures = {};

      MEASURE_KEYS.forEach((key) => {
        measures[key] = average(roomPoints.map((point) => point[key]));
      });

      return {
        time: formatBucketTime(bucket.date, bucketType),
        timestamp: bucketKey,
        value,
        unit: firstPoint.unit || unit || 'kWh',
        room: roomNames.length === 1 ? roomNames[0] : `${roomNames.length || roomPoints.length} rooms`,
        rooms: roomNames,
        nodeId: firstPoint.nodeId || null,
        mac: firstPoint.mac || null,
        index,
        ...measures,
      };
    })
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
};

const normalizeEnergyHistory = (payload, periodKey) => {
  const next = {};
  const groups = Array.isArray(payload?.byFloor) ? payload.byFloor : [];

  groups.forEach((group) => {
    const floor = group.floor || 'Unknown Floor';
    const values = Array.isArray(group.values) ? group.values : [];
    next[floor] = aggregatePoints(values, payload?.unit, periodKey);
  });

  return next;
};

const fetchWithTimeout = async (url, timeoutMs = REQUEST_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

// ═══════════════════════════════════════════════════════════════════
// Chart Point Modal Component
// ═══════════════════════════════════════════════════════════════════
const ChartPointModal = ({ point, visible, onClose, pricePerKwh }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const measureRows = useMemo(
    () => MEASURE_KEYS
      .map((key) => ({ key, ...MEASURE_META[key], value: point?.[key] }))
      .filter((item) => Number.isFinite(Number(item.value))),
    [point]
  );
  const time = point?.time ?? '--';
  const value = toNumber(point?.value);
  const cost = value * pricePerKwh;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={onClose}
          activeOpacity={0.8}
        />
        <Animated.View
          style={[
            styles.detailModal,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.detailHeader}>
            <Text style={styles.detailTitle}>Details at {time}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeBtn}>×</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Energy Consumption</Text>
              <Text style={styles.detailValue}>{formatEnergy(value)} kWh</Text>
            </View>
            {point?.room ? (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Source</Text>
                  <Text style={styles.detailValue}>{point.room}</Text>
                </View>
              </>
            ) : null}
            {measureRows.map((item) => (
              <React.Fragment key={item.key}>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{item.label}</Text>
                  <Text style={styles.detailValue}>
                    {formatNumber(item.value, item.decimals)}{item.unit ? ` ${item.unit}` : ''}
                  </Text>
                </View>
              </React.Fragment>
            ))}
            {measureRows.length === 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>PZEM values</Text>
                  <Text style={styles.detailMuted}>Not available in history</Text>
                </View>
              </>
            ) : null}
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Estimated Cost</Text>
              <Text style={styles.detailValueGreen}>{formatCost(cost)} DT</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Price per kWh</Text>
              <Text style={styles.detailValueBlue}>{formatNumber(pricePerKwh, 3)} DT</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.detailBtn} onPress={onClose}>
            <Text style={styles.detailBtnText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Custom Line Chart Component - Memoized
// ═══════════════════════════════════════════════════════════════════
const CustomLineChart = React.memo(({ data, onPointPress, pricePerKwh = 0.2, onDragChange }) => {
  const chartValues = useMemo(() => (data ?? []).map(d => d.value || 0), [data]);
  const minValue = useMemo(() => Math.min(...chartValues, 0), [chartValues]);
  const maxValue = useMemo(() => Math.max(...chartValues, 0.001), [chartValues]);
  const range = useMemo(() => maxValue - minValue || 1, [maxValue, minValue]);

  const yAxisLabels = useMemo(() => {
    const labels = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const value = minValue + (i / steps) * range;
      labels.push({
        value: formatChartEnergy(value),
      });
    }
    return labels.reverse();
  }, [minValue, range]);

  const xAxisLabels = useMemo(() => {
    const labelInterval = Math.max(1, Math.ceil(chartValues.length / 5));
    return (data ?? [])
      .map((d, i) => ({
        time: d.time || `${i}`,
        index: i,
      }))
      .filter((_, i) => i % labelInterval === 0 || i === chartValues.length - 1);
  }, [data, chartValues.length]);

  const chartItems = useMemo(() => (
    chartValues.map((value, index) => {
      const normalized = (value - minValue) / range;
      return {
        key: `${data?.[index]?.timestamp ?? index}-${index}`,
        value,
        index,
        height: Math.max(4, Math.min(100, normalized * 100)),
        top: Math.max(0, Math.min(96, 100 - normalized * 100)),
        label: xAxisLabels.find((x) => x.index === index)?.time,
      };
    })
  ), [chartValues, data, minValue, range, xAxisLabels]);

  const handleDotPress = useCallback((index) => {
    if (data?.[index]) {
      onPointPress({
        ...data[index],
        time: data[index].time || `Point ${index + 1}`,
      });
    }
  }, [data, onPointPress]);

  if (chartValues.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>Waiting for energy data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.simpleChart}>
      <View style={styles.simpleYAxis}>
        {yAxisLabels.map((label, index) => (
          <Text key={`ylabel-${index}`} style={styles.simpleYAxisLabel}>
            {label.value}
          </Text>
        ))}
      </View>
      <View style={styles.simpleBarsArea}>
        {[0, 1, 2, 3, 4].map((line) => (
          <View key={`grid-${line}`} style={[styles.simpleGridLine, { top: `${line * 25}%` }]} />
        ))}
        <FlatList
          horizontal
          data={chartItems}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          directionalLockEnabled
          scrollEventThrottle={16}
          onScrollBeginDrag={() => onDragChange?.(true)}
          onScrollEndDrag={() => onDragChange?.(false)}
          onMomentumScrollEnd={() => onDragChange?.(false)}
          initialNumToRender={40}
          maxToRenderPerBatch={40}
          windowSize={7}
          removeClippedSubviews
          getItemLayout={(_, index) => ({ length: 38, offset: 38 * index, index })}
          contentContainerStyle={styles.simpleBarsRow}
          renderItem={({ item }) => (
            <View style={styles.simplePointSlot}>
              <TouchableOpacity
                activeOpacity={0.75}
                style={styles.simplePointTouchable}
                onPress={() => handleDotPress(item.index)}
              >
                <View style={[styles.simplePointGuide, { height: `${item.height}%` }]} />
                <View style={[styles.simplePointDot, { top: `${item.top}%` }]} />
              </TouchableOpacity>
              <Text style={styles.simpleXLabel}>
                {item.label ? String(item.label).substring(0, 5) : ''}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
});

CustomLineChart.displayName = 'CustomLineChart';

// ═══════════════════════════════════════════════════════════════════
// Main Reports Page
// ═══════════════════════════════════════════════════════════════════
const ReportsPage = () => {
  const [period, setPeriod] = useState('day');
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [priceInput, setPriceInput] = useState('0.2');
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [historyByFloor, setHistoryByFloor] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartDragging, setChartDragging] = useState(false);
  const [historySource, setHistorySource] = useState('InfluxDB');
  const selectedPeriod = useMemo(
    () => PERIOD_OPTIONS.find((item) => item.key === period) ?? PERIOD_OPTIONS[0],
    [period]
  );

  const fetchJson = useCallback(async (urls) => {
    let lastError = null;
    for (const url of urls) {
      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) throw new Error(`${url} failed (${res.status})`);
        const json = await res.json();
        return { json, url };
      } catch (err) {
        const reason = err?.name === 'AbortError' ? 'timeout' : err.message;
        lastError = new Error(`${url} ${reason}`);
      }
    }
    throw lastError;
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [historyResult, priceResult] = await Promise.all([
        fetchJson([
          `${API_URL}/reports/energy-history?hours=${selectedPeriod.hours}`,
          `${BACKM_API_URL}/stats/energy/history?hours=${selectedPeriod.hours}`,
        ]),
        fetchJson([`${API_URL}/reports/price`]).catch(() => ({ json: { pricePerKwh: 0.2 }, url: null })),
      ]);

      setHistorySource(historyResult.url?.includes(':5050') ? 'BackendM / InfluxDB' : 'Back / InfluxDB');
      setHistoryByFloor(normalizeEnergyHistory(historyResult.json, selectedPeriod.key));
      setPriceInput(String(priceResult.json.pricePerKwh ?? '0.2'));
    } catch (err) {
      console.warn('[ReportsPage] Influx history error:', err.message);
      setError(err.message);
      setHistoryByFloor({});
    } finally {
      setLoading(false);
    }
  }, [fetchJson, selectedPeriod.hours, selectedPeriod.key]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const floors = useMemo(() => Object.keys(historyByFloor).sort(), [historyByFloor]);

  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) {
      setSelectedFloor(floors[0]);
    }
    if (selectedFloor && floors.length > 0 && !floors.includes(selectedFloor)) {
      setSelectedFloor(floors[0]);
    }
  }, [floors, selectedFloor]);

  const chartData = useMemo(
    () => (selectedFloor ? (historyByFloor[selectedFloor] ?? []) : []),
    [historyByFloor, selectedFloor]
  );

  const stats = useMemo(() => {
    const chartValues = chartData
      .map((d) => Number(d.value))
      .filter((value) => Number.isFinite(value));
    const chartSum = chartValues.reduce((a, b) => a + b, 0);
    const valuesByRoom = new Map();

    chartData.forEach((point) => {
      const roomKey = point.room || point.nodeId || point.mac || 'unknown';
      if (!valuesByRoom.has(roomKey)) valuesByRoom.set(roomKey, []);
      const value = Number(point.value);
      if (Number.isFinite(value)) valuesByRoom.get(roomKey).push(value);
    });

    const totalEnergy = Array.from(valuesByRoom.values()).reduce((sum, values) => {
      if (values.length === 0) return sum;
      if (values.length === 1) return sum + values[0];
      return sum + Math.max(0, Math.max(...values) - Math.min(...values));
    }, 0);

    const maxEnergy = chartValues.length ? Math.max(...chartValues) : 0;
    const minEnergy = chartValues.length ? Math.min(...chartValues) : 0;
    const avgEnergy = chartValues.length ? chartSum / chartValues.length : 0;
    const activeRooms = new Set(
      chartData.flatMap((d) => (Array.isArray(d.rooms) && d.rooms.length ? d.rooms : [d.room])).filter(Boolean)
    ).size;
    const lastPoint = chartData[chartData.length - 1];
    return {
      totalEnergy,
      maxEnergy,
      minEnergy,
      avgEnergy,
      activeRooms,
      points: chartValues.length,
      lastEnergy: lastPoint?.value ?? 0,
      lastTime: lastPoint?.time ?? '--',
    };
  }, [chartData]);

  const pricePerKwh = useMemo(() => {
    const parsed = parseFloat(priceInput);
    return isNaN(parsed) ? 0.2 : Math.max(0, parsed);
  }, [priceInput]);

  const estimatedCost = stats.totalEnergy * pricePerKwh;
  const connectionStatus = error ? 'disconnected' : 'connected';

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      scrollEnabled={!chartDragging}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Energy Reports</Text>
            <Text style={styles.subtitle}>InfluxDB / backend history</Text>
          </View>
          <View
            style={[
              styles.connectionBadge,
              { backgroundColor: connectionStatus === 'connected' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)' },
            ]}
          >
            {connectionStatus === 'connected' ? (
              <Wifi size={16} color="#10B981" />
            ) : (
              <WifiOff size={16} color="#EF4444" />
            )}
            <Text
              style={[
                styles.connectionText,
                { color: connectionStatus === 'connected' ? '#10B981' : '#EF4444' },
              ]}
            >
              {connectionStatus === 'connected' ? historySource : 'Error'}
            </Text>
          </View>
        </View>
      </View>

      {/* Price Card */}
      <View style={styles.priceCard}>
        <Text style={styles.priceLabel}>Price per kWh</Text>
        <View style={styles.priceRow}>
          <TextInput
            style={styles.priceInput}
            value={priceInput}
            onChangeText={setPriceInput}
            keyboardType="decimal-pad"
            placeholder="0.200"
          />
          <Text style={styles.priceCurrency}>DT</Text>
        </View>
      </View>

      {/* Period Filters */}
      <View style={styles.filtersRow}>
        {PERIOD_OPTIONS.map((item) => (
          <TouchableOpacity
            key={item.key}
            style={[styles.filterBtn, period === item.key && styles.filterBtnActive]}
            onPress={() => setPeriod(item.key)}
          >
            <Text style={[styles.filterBtnText, period === item.key && styles.filterBtnTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Floor Filter */}
      {floors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.floorFiltersScroll}>
          <View style={styles.floorFiltersRow}>
            {floors.map((floor, idx) => (
              <TouchableOpacity
                key={`floor-${floor}`}
                style={[
                  styles.floorFilterBtn,
                  selectedFloor === floor && styles.floorFilterBtnActive,
                  { borderColor: FLOOR_COLORS[idx % FLOOR_COLORS.length] },
                ]}
                onPress={() => setSelectedFloor(floor)}
              >
                <View
                  style={[
                    styles.floorFilterDot,
                    {
                      backgroundColor:
                        selectedFloor === floor
                          ? FLOOR_COLORS[idx % FLOOR_COLORS.length]
                          : '#D1D5DB',
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.floorFilterText,
                    selectedFloor === floor && styles.floorFilterTextActive,
                  ]}
                >
                  {floor}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.floorFilterBtn} onPress={fetchHistory}>
              <Text style={styles.floorFilterText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Energy Chart */}
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.chartTitle}>Energy History - {selectedPeriod.label}</Text>
            {selectedFloor && (
              <Text style={styles.chartSubtitle}>
                {selectedPeriod.subtitle}
                {' '} | {' '}
                Chart Max: <Text style={styles.highlight}>{formatEnergy(stats.maxEnergy)} kWh</Text>
                {' '} | Chart Avg: <Text style={styles.highlightGreen}>{formatEnergy(stats.avgEnergy)} kWh</Text>
              </Text>
            )}
          </View>
          <View style={styles.trendIcon}>
            <TrendingUp size={24} color="#8B5CF6" />
          </View>
        </View>

        {selectedFloor && chartData.length > 0 ? (
          <>
            <CustomLineChart
              data={chartData}
              onPointPress={setSelectedPoint}
              pricePerKwh={pricePerKwh}
              onDragChange={setChartDragging}
            />
            <Text style={styles.interactionHint}>Swipe the chart to view values, tap a point for details</Text>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            {loading ? (
              <ActivityIndicator size="large" color="#8B5CF6" />
            ) : (
              <Text style={styles.noDataText}>
                {error || (selectedFloor ? `No energy values for ${selectedPeriod.label}` : 'Select a floor to view data')}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Chart Analysis Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#8B5CF6' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>Total Energy</Text>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(139,92,246,0.15)' }]}>
              <Zap size={20} color="#8B5CF6" />
            </View>
          </View>
          <Text style={styles.statValue}>
            {formatEnergy(stats.totalEnergy)} kWh
          </Text>
          <Text style={styles.statChange}>
            {stats.points} values from InfluxDB
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#EC4899' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>Chart Max</Text>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(236,72,153,0.15)' }]}>
              <TrendingUp size={20} color="#EC4899" />
            </View>
          </View>
          <Text style={styles.statValue}>
            {formatEnergy(stats.maxEnergy)} kWh
          </Text>
          <Text style={styles.statChange}>
            Avg: {formatEnergy(stats.avgEnergy)} kWh
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>Est. Cost</Text>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(59,130,246,0.15)' }]}>
              <DollarSign size={20} color="#3B82F6" />
            </View>
          </View>
          <Text style={styles.statValue}>
            {formatCost(Math.max(0, estimatedCost))} DT
          </Text>
          <Text style={styles.statChange}>
            {formatEnergy(stats.totalEnergy)} kWh @ {formatNumber(pricePerKwh, 3)} DT
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: '#10B981' }]}>
          <View style={styles.statHeader}>
            <Text style={styles.statTitle}>Rooms in Chart</Text>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <AlertTriangle size={20} color="#10B981" />
            </View>
          </View>
          <Text style={styles.statValue}>
            {stats.activeRooms}
          </Text>
          <Text style={styles.statChange}>
            Last value: {formatEnergy(stats.lastEnergy)} kWh at {stats.lastTime}
          </Text>
        </View>
      </View>

      {/* Detail Modal */}
      {selectedPoint && (
        <ChartPointModal
          point={selectedPoint}
          visible={!!selectedPoint}
          onClose={() => setSelectedPoint(null)}
          pricePerKwh={pricePerKwh}
        />
      )}
    </ScrollView>
  );
};

// ═══════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  connectionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  priceCard: {
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#EC4899',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  priceCurrency: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  filterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  filterBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#FFF',
  },
  floorFiltersScroll: {
    marginHorizontal: 24,
    marginBottom: 20,
  },
  floorFiltersRow: {
    flexDirection: 'row',
    gap: 8,
  },
  floorFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 10,
    backgroundColor: '#FFF',
  },
  floorFilterBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  floorFilterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  floorFilterText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  floorFilterTextActive: {
    color: '#FFF',
  },
  chartCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: '#EC4899',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  chartSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  highlight: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  highlightGreen: {
    color: '#10B981',
    fontWeight: '700',
  },
  trendIcon: {
    backgroundColor: 'rgba(139,92,246,0.1)',
    padding: 10,
    borderRadius: 12,
  },
  noDataContainer: {
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  simpleChart: {
    height: CHART_HEIGHT,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  simpleYAxis: {
    width: 54,
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingRight: 6,
  },
  simpleYAxisLabel: {
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  simpleBarsArea: {
    flex: 1,
    height: CHART_HEIGHT,
    paddingTop: 8,
    paddingBottom: 28,
    position: 'relative',
  },
  simpleGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  simpleBarsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
    paddingHorizontal: 4,
  },
  simplePointSlot: {
    width: 32,
    alignItems: 'center',
  },
  simplePointTouchable: {
    flex: 1,
    width: '100%',
    minHeight: 220,
    position: 'relative',
    alignItems: 'center',
  },
  simplePointGuide: {
    position: 'absolute',
    bottom: 0,
    width: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(139,92,246,0.16)',
  },
  simplePointDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#8B5CF6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  simpleXLabel: {
    height: 18,
    marginTop: 6,
    fontSize: 9,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  tapAreasContainer: {
    flexDirection: 'row',
    height: 40,
    marginTop: -20,
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  tapArea: {
    width: '10%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  interactionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginTop: 12,
    textAlign: 'center',
  },
  statsGrid: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  modalRoot: {
    flex: 1,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  detailModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    fontSize: 28,
    color: '#9CA3AF',
    lineHeight: 28,
  },
  detailContent: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  detailValueGreen: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  detailValueBlue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  detailMuted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'right',
    flexShrink: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  detailBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ReportsPage;
