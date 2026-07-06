import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Zap, Thermometer, Briefcase, AlertTriangle,
  Sun, Droplets, Wind, Activity, ChevronDown,
  Building2, Radio,
} from 'lucide-react-native';
import { useSensorSocket } from '../../hook/useSensorSocket';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const socket = io('http://172.28.40.165:5000');
const BACK_API_URL = 'http://172.28.40.165:5000/api';

/* ══════════════════════════════════════════════════
   FLOOR COLORS
══════════════════════════════════════════════════ */
const FLOOR_COLORS = [
  { color: '#3b82f6', colorDim: 'rgba(59,130,246,0.10)'  },
  { color: '#8B5CF6', colorDim: 'rgba(139,92,246,0.10)'  },
  { color: '#10b981', colorDim: 'rgba(16,185,129,0.10)'  },
  { color: '#f59e0b', colorDim: 'rgba(245,158,11,0.10)'  },
  { color: '#06b6d4', colorDim: 'rgba(6,182,212,0.10)'   },
  { color: '#ef4444', colorDim: 'rgba(239,68,68,0.10)'   },
];
const DONUT_COLORS = [
  '#8B5CF6',
  '#10B981',
  '#F59E0B',
  '#06B6D4',
  '#EF4444',
  '#EC4899',
  '#3B82F6',
];
const getDonutColor = (index) => DONUT_COLORS[index % DONUT_COLORS.length];
const FLOOR_COLOR_FALLBACK = { color: '#6b7280', colorDim: 'rgba(107,114,128,0.10)' };

function getFloorColor(idx) { return FLOOR_COLORS[idx] ?? FLOOR_COLOR_FALLBACK; }

function floorShort(label = '') {
  const words = label.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.map(w => w[0]).join('').slice(0, 3).toUpperCase();
}

function isToday(dateLike) {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate()
  );
}

async function getAuthHeaders() {
  const raw = await AsyncStorage.getItem('user') || await AsyncStorage.getItem('userData');
  if (!raw) return {};
  const user = JSON.parse(raw);
  return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
}

/* ══════════════════════════════════════════════════
   PZEM CONFIG
══════════════════════════════════════════════════ */
const PZEM_METRICS = ['voltage', 'current', 'power', 'frequency', 'power_factor'];

const PZEM_CONFIG = {
  voltage:      { label: 'Voltage',     unit: 'V',  color: '#6366F1', gradientColors: ['#6366F1', '#818CF8'], bgColor: 'rgba(99,102,241,0.12)'  },
  current:      { label: 'Current',     unit: 'A',  color: '#10B981', gradientColors: ['#10B981', '#34D399'], bgColor: 'rgba(16,185,129,0.12)'  },
  power:        { label: 'Power',       unit: 'W',  color: '#F59E0B', gradientColors: ['#F59E0B', '#FCD34D'], bgColor: 'rgba(245,158,11,0.12)'  },
  frequency:    { label: 'Frequency',   unit: 'Hz', color: '#A78BFA', gradientColors: ['#A78BFA', '#C4B5FD'], bgColor: 'rgba(167,139,250,0.12)' },
  power_factor: { label: 'Pwr Factor',  unit: '',   color: '#EC4899', gradientColors: ['#EC4899', '#F9A8D4'], bgColor: 'rgba(236,72,153,0.12)'  },
};

const PZEM_DISPLAY_MAX = {
  voltage: 260, current: 20, power: 5000, frequency: 60, power_factor: 1,
};

const normalize = (type, value) => {
  const max = PZEM_DISPLAY_MAX[type] ?? 100;
  return Math.max(2, Math.min(100, Math.round((value / max) * 100)));
};

/* ══════════════════════════════════════════════════
   SENSOR CATALOG
══════════════════════════════════════════════════ */
const SENSOR_CATALOG = {
  temperature: {
    label: 'Temperature', icon: (c) => <Thermometer size={16} color={c} />,
    iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.10)', rowColor: '#f59e0b',
    format: (v, u) => `${Number(v).toFixed(1)} ${u ?? '°C'}`,
    status: (v) => v > 28 ? '⚠ High' : v < 18 ? '⚠ Low' : '✓ Normal',
    statusColor: (v) => (v > 28 || v < 18) ? '#EF4444' : '#10B981',
  },
  energy: {
    label: 'Energy', icon: (c) => <Zap size={16} color={c} />,
    iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.10)', rowColor: '#8B5CF6',
    format: (v, u) => `${Number(v).toLocaleString()} ${u ?? 'kWh'}`,
    status: () => '↓ vs last month', statusColor: () => '#10B981',
  },
  light: {
    label: 'Light Level', icon: (c) => <Sun size={16} color={c} />,
    iconColor: '#F59E0B', iconBg: 'rgba(245,158,11,0.10)', rowColor: '#f59e0b',
    format: (v, u) => `${Number(v).toFixed(0)} ${u ?? 'lux'}`,
    status: (v) => v > 800 ? '☀ Very bright' : v > 400 ? '🌤 Bright' : '🌑 Low',
    statusColor: () => '#6B7280',
  },
  humidity: {
    label: 'Humidity', icon: (c) => <Droplets size={16} color={c} />,
    iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.10)', rowColor: '#3b82f6',
    format: (v) => `${Number(v).toFixed(1)} %`,
    status: (v) => v > 70 ? '⚠ Humid' : v < 30 ? '⚠ Dry' : '✓ Normal',
    statusColor: (v) => (v > 70 || v < 30) ? '#F59E0B' : '#10B981',
  },
  smoke: {
    label: 'Smoke / Gas', icon: (c) => <Wind size={16} color={c} />,
    iconColor: '#F59E0B', iconBg: 'rgba(245,158,11,0.10)', rowColor: '#f59e0b',
    format: (v) => `${Number(v).toFixed(1)} ppm`,
    status: (v) => v > 0 ? '⚠ Alert' : '✓ Clear',
    statusColor: (v) => v > 0 ? '#EF4444' : '#10B981',
  },
  motion: {
    label: 'Motion', icon: (c) => <Activity size={16} color={c} />,
    iconColor: '#10B981', iconBg: 'rgba(16,185,129,0.10)', rowColor: '#06b6d4',
    format: (v) => (v === 1 || v === '1') ? 'Detected' : 'None',
    status: (v) => (v === 1 || v === '1') ? '🟢 Active' : '⚪ Idle',
    statusColor: () => '#6B7280',
  },
  
};

const ROOM_META_KEYS = new Set(['floor', 'room', 'nodeId', 'timestamp']);
const PZEM_CHART_ONLY_KEYS = new Set(['voltage', 'current', 'power', 'frequency', 'power_factor']);

function getSensorKeys(roomData) {
  if (!roomData) return [];
  return Object.keys(roomData).filter(k => !ROOM_META_KEYS.has(k) && SENSOR_CATALOG[k] != null);
}

function getRoomStatus(roomData) {
  const co2  = roomData?.co2?.value  ?? roomData?.co2;
  const temp = roomData?.temperature?.value ?? roomData?.temperature;
  if (co2  != null && Number(co2)  > 850)                        return 'alert';
  if (temp != null && (Number(temp) > 28 || Number(temp) < 16)) return 'warning';
  if (roomData?.smoke?.value > 0)                                return 'alert';
  return 'normal';
}

const STATUS_CFG = {
  normal:  { bg: 'rgba(16,185,129,0.10)',  color: '#10b981', label: 'Normal'  },
  alert:   { bg: 'rgba(239,68,68,0.10)',   color: '#ef4444', label: 'Alert'   },
  warning: { bg: 'rgba(245,158,11,0.10)',  color: '#f59e0b', label: 'Warning' },
};

/* ══════════════════════════════════════════════════
   PZEM HISTORY HOOK (par floor)
══════════════════════════════════════════════════ */
function usePzemHistoryByFloor(latestByRoom) {
  // { [floorLabel]: slot[] }
  const [historyByFloor, setHistoryByFloor] = useState({});
  const lastSlotRef = useRef({});

  useEffect(() => {
    if (!latestByRoom || Object.keys(latestByRoom).length === 0) return;

    const now   = new Date();
    const m     = now.getMinutes() < 30 ? 0 : 30;
    const label = `${String(now.getHours()).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

    // Group rooms by floor
    const byFloor = {};
    Object.values(latestByRoom).forEach((roomData) => {
      const floorLabel = roomData?.floor ?? 'Unknown Floor';
      if (!byFloor[floorLabel]) byFloor[floorLabel] = [];
      byFloor[floorLabel].push(roomData);
    });

    setHistoryByFloor((prev) => {
      const next = { ...prev };
      Object.entries(byFloor).forEach(([floorLabel, rooms]) => {
        // Skip if slot already recorded for this time+floor
        if (lastSlotRef.current[floorLabel] === label) return;
        lastSlotRef.current[floorLabel] = label;

        // Average PZEM values across all rooms of the floor
        const avg = (key) => {
          const vals = rooms.map(r => r?.[key]?.value).filter(v => v != null);
          if (!vals.length) return null;
          return vals.reduce((a, b) => a + b, 0) / vals.length;
        };

        const voltage      = avg('voltage');
        const current      = avg('current');
        const power        = avg('power');
        const frequency    = avg('frequency');
        const power_factor = avg('power_factor');

        const prevSlots = prev[floorLabel] ?? [];
        const last      = prevSlots[prevSlots.length - 1];
        let anomaly     = false;
        if (last?.current != null && current != null && last.current !== 0) {
          anomaly = Math.abs(current - last.current) / last.current > 0.30;
        }

        const newSlot = { time: label, voltage, current, power, frequency, power_factor, _anomaly: anomaly };
        next[floorLabel] = [...prevSlots, newSlot].slice(-16);
      });
      return next;
    });
  }, [latestByRoom]);

  return historyByFloor;
}

/* ══════════════════════════════════════════════════
   PZEM BAR CHART (réutilisé du staff dashboard)
══════════════════════════════════════════════════ */
function PzemBarChart({ data, liveValues, accentColor }) {
  const [activeMetrics, setActiveMetrics] = useState(new Set(PZEM_METRICS));

  const toggleMetric = (key) => {
    setActiveMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  const slots          = data?.length ? data : [];
  const visibleMetrics = PZEM_METRICS.filter((m) => activeMetrics.has(m));
  const barWidth =
    visibleMetrics.length <= 2 ? 14 :
    visibleMetrics.length === 3 ? 11 :
    visibleMetrics.length === 4 ? 9 : 7;

  return (
    <View style={{ marginTop: 16 }}>
      {/* Legend toggles */}
      <View style={chartStyles.pzemLegend}>
        {PZEM_METRICS.map((key) => {
          const cfg    = PZEM_CONFIG[key];
          const active = activeMetrics.has(key);
          return (
            <TouchableOpacity
              key={key}
              style={[chartStyles.legendChip, { borderColor: cfg.color, backgroundColor: active ? cfg.bgColor : 'transparent' }]}
              onPress={() => toggleMetric(key)}
            >
              <View style={[chartStyles.legendDot, { backgroundColor: active ? cfg.color : '#D1D5DB' }]} />
              <Text style={[chartStyles.legendLabel, { color: active ? cfg.color : '#9CA3AF' }]}>{cfg.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bars */}
      {slots.length === 0 ? (
        <View style={chartStyles.chartEmpty}>
          <Zap size={24} color="#D1D5DB" />
          <Text style={chartStyles.chartEmptyText}>Waiting for PZEM data…</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={chartStyles.pzemChartWrap}>
            <Text style={chartStyles.pzemYLabel}>%</Text>
            <View style={chartStyles.pzemBarsArea}>
              {slots.map((slot, si) => (
                <View key={si} style={chartStyles.pzemSlot}>
                  <View style={chartStyles.pzemBarGroup}>
                    {visibleMetrics.map((key) => {
                      const cfg       = PZEM_CONFIG[key];
                      const val       = slot[key];
                      const h         = val != null ? normalize(key, val) : 0;
                      const isAnomaly = key === 'current' && slot._anomaly;
                      return (
                        <View key={key} style={{ marginHorizontal: 1 }}>
                          <LinearGradient
                            colors={isAnomaly ? ['#EF4444', '#F87171'] : cfg.gradientColors}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={[
                              chartStyles.pzemBar,
                              { width: barWidth, height: `${h}%`, borderRadius: 4 },
                              isAnomaly && chartStyles.pzemBarAnomaly,
                            ]}
                          />
                        </View>
                      );
                    })}
                  </View>
                  {slot._anomaly && (
                    <View style={chartStyles.anomalyMarker}>
                      <Text style={chartStyles.anomalyMarkerText}>⚠</Text>
                    </View>
                  )}
                  <Text style={chartStyles.pzemTimeLabel}>{slot.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Annotations */}
      <View style={chartStyles.pzemAnnotations}>
        {PZEM_METRICS.filter((m) => activeMetrics.has(m)).map((key) => {
          const cfg      = PZEM_CONFIG[key];
          const fromSlot = slots.length ? slots[slots.length - 1][key] : null;
          const latest   = liveValues?.[key] ?? fromSlot;
          const display  = latest != null
            ? `${Number(latest).toFixed(2)}${cfg.unit ? ' ' + cfg.unit : ''}`
            : '--';
          return (
            <View key={key} style={[chartStyles.annotationChip, { backgroundColor: cfg.bgColor, borderColor: cfg.color }]}>
              <Text style={[chartStyles.annotationVal, { color: cfg.color }]}>{display}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════
   PZEM MULTI-FLOOR CARD  ← nouvelle section admin
══════════════════════════════════════════════════ */
function PzemMultiFloorCard({ floors, historyByFloor, latestByRoom }) {
  const [selectedFloor, setSelectedFloor] = useState(null);

  // Auto-select first floor
  useEffect(() => {
    if (floors.length > 0 && !selectedFloor) {
      setSelectedFloor(floors[0].label);
    }
  }, [floors]);

  const activeFloor = floors.find(f => f.label === selectedFloor) ?? floors[0];

  const slots = historyByFloor[selectedFloor] ?? [];

  // Live values = average of all rooms on selected floor
  const liveValues = useMemo(() => {
    if (!selectedFloor) return null;
    const rooms = Object.values(latestByRoom).filter(r => r?.floor === selectedFloor);
    if (!rooms.length) return null;
    const avg = (key) => {
      const vals = rooms.map(r => r?.[key]?.value).filter(v => v != null);
      if (!vals.length) return null;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };
    return {
      voltage:      avg('voltage'),
      current:      avg('current'),
      power:        avg('power'),
      frequency:    avg('frequency'),
      power_factor: avg('power_factor'),
    };
  }, [selectedFloor, latestByRoom]);

  return (
    <View style={styles.chartCard}>
      {/* Header */}
      <View style={styles.chartHeaderRow}>
        <Text style={styles.chartTitle}>Energy Consumption</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>30 min history · PZEM</Text>
      </View>

      {/* Floor filter pills */}
      {floors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
          <View style={chartStyles.floorFilters}>
            {floors.map((floor) => {
              const active = selectedFloor === floor.label;
              return (
                <TouchableOpacity
                  key={floor.label}
                  style={[
                    chartStyles.floorPill,
                    {
                      backgroundColor: active ? floor.color : floor.colorDim,
                      borderColor: floor.color,
                    },
                  ]}
                  onPress={() => setSelectedFloor(floor.label)}
                >
                  <View style={[chartStyles.floorPillDot, { backgroundColor: active ? '#fff' : floor.color }]} />
                  <Text style={[chartStyles.floorPillText, { color: active ? '#fff' : floor.color }]}>
                    {floor.label}
                  </Text>
                  {(floor.alertCount > 0 || floor.warningCount > 0) && (
                    <View style={chartStyles.floorPillAlert}>
                      <Text style={{ fontSize: 8, color: active ? '#fff' : '#ef4444' }}>⚠</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* PZEM Chart for selected floor */}
      {floors.length === 0 ? (
        <View style={chartStyles.chartEmpty}>
          <Building2 size={24} color="#D1D5DB" />
          <Text style={chartStyles.chartEmptyText}>Waiting for floor data…</Text>
        </View>
      ) : (
        <PzemBarChart
          data={slots}
          liveValues={liveValues}
          accentColor={activeFloor?.color ?? '#8B5CF6'}
        />
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════
   TOP STATS ROW
══════════════════════════════════════════════════ */
const TopStatsRow = ({ floors, totalSensors, todayAlertCount, onlineUsers }) => {
  const totalFloors = floors.length;
  const totalRooms  = floors.reduce((a, f) => a + f.roomCount, 0);
  const onlinePercentage = onlineUsers.total > 0
    ? Math.round((onlineUsers.current / onlineUsers.total) * 100)
    : 0;
  const stats = [
    { label: 'Floors',    value: totalFloors, sub: `${totalRooms} rooms`, iconBg: 'rgba(59,130,246,0.10)',  icon: <Building2 size={18} color="#3b82f6" />, valueColor: '#111827' },
    { label: 'Sensors',   value: totalSensors, sub: 'Active',             iconBg: 'rgba(16,185,129,0.10)',  icon: <Radio size={18} color="#10b981" />,     valueColor: '#111827' },
    { label: 'Alerts',    value: todayAlertCount, sub: 'notifications today', iconBg: 'rgba(239,68,68,0.10)', icon: <AlertTriangle size={18} color="#ef4444" />, valueColor: todayAlertCount > 0 ? '#ef4444' : '#111827' },
    { label: 'Positions', value: `${onlineUsers.current}/${onlineUsers.total}`, sub: `${onlinePercentage}% online now`, iconBg: 'rgba(139,92,246,0.10)', icon: <Briefcase size={18} color="#8B5CF6" />, valueColor: '#111827' },
  ];
  return (
    <View style={styles.topStatsRow}>
      {stats.map((s, i) => (
        <View key={i} style={styles.topStatCard}>
          <View style={[styles.topStatIcon, { backgroundColor: s.iconBg }]}>{s.icon}</View>
          <Text style={[styles.topStatValue, { color: s.valueColor }]}>{s.value}</Text>
          <Text style={styles.topStatLabel}>{s.label}</Text>
          <Text style={styles.topStatSub}>{s.sub}</Text>
        </View>
      ))}
    </View>
  );
};

/* ══════════════════════════════════════════════════
   SENSOR ROW
══════════════════════════════════════════════════ */
const SensorRow = ({ sensorKey, sensorData }) => {
  const cfg = SENSOR_CATALOG[sensorKey];
  if (!cfg) return null;
  const val     = sensorData?.value ?? sensorData;
  const unit    = sensorData?.unit;
  const display = val != null ? cfg.format(val, unit) : '--';
  const statusLabel = val != null ? cfg.status(val) : '--';
  const statusColor = val != null ? cfg.statusColor(val) : '#6B7280';
  return (
    <View style={styles.sensorRow}>
      <View style={[styles.sensorIconWrap, { backgroundColor: cfg.iconBg }]}>{cfg.icon(cfg.iconColor)}</View>
      <View style={styles.sensorMiddle}>
        <Text style={styles.sensorLabel}>{cfg.label}</Text>
        <Text style={[styles.sensorStatus, { color: statusColor }]}>{statusLabel}</Text>
      </View>
      <Text style={[styles.sensorValue, { color: cfg.rowColor }]}>{display}</Text>
    </View>
  );
};

/* ══════════════════════════════════════════════════
   ROOM ACCORDION
══════════════════════════════════════════════════ */
const RoomAccordionCard = ({ roomKey, roomData, floorColor }) => {
  const [expanded, setExpanded] = useState(false);
  const status     = getRoomStatus(roomData);
  const sc         = STATUS_CFG[status];
  const sensorKeys = getSensorKeys(roomData);
  const roomName   = roomData?.room ?? roomKey;
  const nodeId     = roomData?.nodeId ?? '—';
  const now        = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={[styles.roomCard, { borderColor: sc.color + '28' }]}>
      <View style={[styles.roomAccentBar, { backgroundColor: floorColor }]} />
      <TouchableOpacity activeOpacity={0.75} onPress={handleToggle} style={styles.roomCardHeader}>
        <View style={[styles.roomStatusDot, { backgroundColor: sc.color }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.roomName}>{roomName}</Text>
          <View style={styles.roomMetaRow}>
            <Text style={styles.roomMetaText}>{sensorKeys.length} sensors</Text>
            <View style={styles.metaDivider} />
            <Text style={styles.roomMetaText}>{nodeId}</Text>
            <View style={styles.metaDivider} />
            <View style={styles.liveIndicator} />
            <Text style={[styles.roomMetaText, { color: '#10b981', fontWeight: '600' }]}>Live</Text>
          </View>
        </View>
        <View style={[styles.roomStatusBadge, { backgroundColor: sc.bg }]}>
          <Text style={{ color: sc.color, fontSize: 10, fontWeight: '600' }}>{sc.label}</Text>
        </View>
        <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
          <ChevronDown size={16} color="#9CA3AF" />
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.sensorPanel, { borderTopColor: floorColor + '33' }]}>
          {sensorKeys.length === 0 ? (
            <Text style={styles.noSensorText}>No sensor data available</Text>
          ) : (
            <>
              {sensorKeys.map(k => (
                <SensorRow key={k} sensorKey={k} sensorData={roomData[k]} />
              ))}
              <View style={styles.sensorPanelFooter}>
                <Text style={styles.roomFooterText}>Real-time · auto refresh</Text>
                <Text style={styles.roomFooterTime}>Updated {now}</Text>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
};

/* ══════════════════════════════════════════════════
   FLOOR DETAIL CARD
══════════════════════════════════════════════════ */
const FloorDetailCard = ({ floor, latestByRoom }) => {
  const [expanded, setExpanded] = useState(false);
  const floorRooms = useMemo(
    () => Object.entries(latestByRoom).filter(([, data]) => data?.floor === floor.label),
    [latestByRoom, floor.label],
  );
  const handleToggle = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(prev => !prev);
  }, []);

  return (
    <View style={[styles.floorDetailCard, { borderColor: floor.color + '33' }]}>
      <LinearGradient colors={[floor.color, floor.color + 'AA']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.floorDetailAccent} />
      <TouchableOpacity activeOpacity={0.82} onPress={handleToggle} style={styles.floorDetailHeader}>
        <View style={[styles.floorDetailBadge, { backgroundColor: floor.colorDim }]}>
          <Text style={[styles.floorDetailShort, { color: floor.color }]}>{floor.short}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.floorDetailName}>{floor.label}</Text>
          <Text style={styles.floorDetailMeta}>{floor.roomCount} room{floor.roomCount !== 1 ? 's' : ''} · {floor.sensorCount} sensor{floor.sensorCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.floorDetailRight}>
          {floor.alertCount > 0 && (
            <View style={[styles.floorMiniChip, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
              <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '700' }}>⚠ {floor.alertCount}</Text>
            </View>
          )}
          {floor.warningCount > 0 && (
            <View style={[styles.floorMiniChip, { backgroundColor: 'rgba(245,158,11,0.12)' }]}>
              <Text style={{ color: '#f59e0b', fontSize: 10, fontWeight: '700' }}>⚡ {floor.warningCount}</Text>
            </View>
          )}
          {floor.alertCount === 0 && floor.warningCount === 0 && (
            <View style={[styles.floorMiniChip, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
              <Text style={{ color: '#10b981', fontSize: 10, fontWeight: '700' }}>✓ OK</Text>
            </View>
          )}
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }], marginLeft: 4 }}>
            <ChevronDown size={18} color={floor.color} />
          </View>
        </View>
      </TouchableOpacity>
      {expanded && (
        <View style={[styles.floorRoomsPanel, { borderTopColor: floor.color + '22' }]}>
          {floorRooms.length === 0 ? (
            <View style={styles.emptyState}><Text style={styles.emptyStateText}>No rooms detected on this floor yet.</Text></View>
          ) : (
            floorRooms.map(([roomKey, roomData]) => (
              <RoomAccordionCard key={roomKey} roomKey={roomKey} roomData={roomData} floorColor={floor.color} />
            ))
          )}
        </View>
      )}
    </View>
  );
};

/* ══════════════════════════════════════════════════
   IOT ICON CONFIG
══════════════════════════════════════════════════ */
const SERVER_URL_API = 'http://172.28.40.165:5000'; // same as SERVER_URL

const IOT_ICON_CONFIG = {
  lighting:    { label: 'Lighting',    emoji: '\u{1F4A1}', color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)'  },
  hvac:        { label: 'HVAC',        emoji: '\u2744\uFE0F',  color: '#06B6D4', bgColor: 'rgba(6,182,212,0.12)'   },
  cameras:     { label: 'Cameras',     emoji: '\u{1F4F7}', color: '#8B5CF6', bgColor: 'rgba(139,92,246,0.12)'  },
  access:      { label: 'Access',      emoji: '\u{1F510}', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)'   },
  fire:        { label: 'Fire',        emoji: '\u{1F525}', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)'   },
  water:       { label: 'Water',       emoji: '\u{1F4A7}', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)'  },
  energy:      { label: 'Energy',      emoji: '\u26A1',    color: '#10B981', bgColor: 'rgba(16,185,129,0.12)'  },
  temperature: { label: 'Temperature', emoji: '\u{1F321}', color: '#EF4444', bgColor: 'rgba(239,68,68,0.12)'   },
  light:       { label: 'Light',       emoji: '\u2600\uFE0F',  color: '#F59E0B', bgColor: 'rgba(245,158,11,0.12)'  },
  humidity:    { label: 'Humidity',    emoji: '\u{1F4A7}', color: '#3B82F6', bgColor: 'rgba(59,130,246,0.12)'  },
  pressure:    { label: 'Pressure',    emoji: '\u{1F300}', color: '#A78BFA', bgColor: 'rgba(167,139,250,0.12)' },
  smoke:       { label: 'Smoke',       emoji: '\u{1F32B}', color: '#6B7280', bgColor: 'rgba(107,114,128,0.12)' },
  motion:      { label: 'Motion',      emoji: '\u{1F441}', color: '#10B981', bgColor: 'rgba(16,185,129,0.12)'  },
};

/* ══════════════════════════════════════════════════
   IOT DISTRIBUTION CARD
══════════════════════════════════════════════════ */
function IotDistributionCard() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://172.28.40.165:5000/api/equipment')
      .then(r => r.json())
      .then(data => { setDevices(Array.isArray(data) ? data : (data.data ?? [])); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const total = devices.length;

  // Group by icon type, compute count + %
 const groups = useMemo(() => {
  const map = {};
  devices.forEach(d => {
    const key = d.icon ?? 'lighting';
    if (!map[key]) map[key] = 0;
    map[key] += 1;
  });

  return Object.entries(map)
    .map(([icon, count], index) => ({
      label: icon.charAt(0).toUpperCase() + icon.slice(1),
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      color: getDonutColor(index), // 👈 AJOUT IMPORTANT
    }))
    .sort((a, b) => b.count - a.count);
}, [devices, total]);

  // Colors for the stat chips below the donut
  const CHIP_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#EF4444', '#EC4899', '#3B82F6'];

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>IoT Distribution</Text>

      {loading ? (
        <View style={styles.chartPlaceholder}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.chartPlaceholder}>
  <View style={styles.donutWrapper}>

    {/* Donut segments */}
    <View style={styles.donutContainer}>
      {groups.map((g, index) => {
        const cfg =
          IOT_ICON_CONFIG[g.label.toLowerCase()] ??
          IOT_ICON_CONFIG.lighting;

        return (
          <View
            key={g.label}
            style={[
              styles.donutSegment,
              {
                borderColor: g.color,
                transform: [
                  { rotate: `${index * (360 / groups.length)}deg` },
                ],
              },
            ]}
          />
        );
      })}

      {/* Center */}
      <View style={styles.donutCenter}>
        <Text style={styles.donutValue}>{total}</Text>
        <Text style={styles.donutLabel}>Modules</Text>
      </View>
    </View>

  </View>
</View>
      )}

      <View style={styles.energyStats}>
        {groups.slice(0, 3).map((g, i) => (
          <View key={g.label} style={styles.energyStat}>
            <Text style={styles.energyStatLabel}>{g.label}</Text>
            <Text style={[styles.energyStatValue, { color: groups[i]?.color ?? '#8B5CF6' }]}>
              {g.count} <Text style={{ fontSize: 12 }}>({g.pct}%)</Text>
            </Text>
          </View>
        ))}
      </View>

      {/* Extra groups if more than 3 types */}
      {groups.length > 3 && (
        <View style={[styles.energyStats, { marginTop: 8 }]}>
          {groups.slice(3, 6).map((g, i) => (
            <View key={g.label} style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>{g.label}</Text>
              <Text style={[styles.energyStatValue, { color: CHIP_COLORS[i + 3] ?? '#6B7280' }]}>
                {g.count} <Text style={{ fontSize: 12 }}>({g.pct}%)</Text>
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}


/* ══════════════════════════════════════════════════
   CHART STYLES (PZEM)
══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   ADMIN DASHBOARD
══════════════════════════════════════════════════ */
const AdminDashboard = ({ userData }) => {
  const [socketStats, setSocketStats] = useState({
    activeStations: { current: 0, total: 0, percentage: 0 },
    alerts: { count: 0, change: 0 },
  });
  const [todayAlertCount, setTodayAlertCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState({ current: 0, total: 0 });

  const { latestByRoom } = useSensorSocket();

  const floors = useMemo(() => {
    const floorMap = {};
    Object.entries(latestByRoom).forEach(([roomKey, roomData]) => {
      const floorLabel = roomData?.floor ?? 'Unknown Floor';
      if (!floorMap[floorLabel]) floorMap[floorLabel] = { rooms: [], sensorCount: 0, alertCount: 0, warningCount: 0 };
      const status = getRoomStatus(roomData);
      floorMap[floorLabel].rooms.push(roomKey);
      floorMap[floorLabel].sensorCount  += getSensorKeys(roomData).length;
      if (status === 'alert')   floorMap[floorLabel].alertCount   += 1;
      if (status === 'warning') floorMap[floorLabel].warningCount += 1;
    });
    return Object.entries(floorMap).map(([label, info], idx) => ({
      label, short: floorShort(label),
      roomCount: info.rooms.length, sensorCount: info.sensorCount,
      alertCount: info.alertCount, warningCount: info.warningCount,
      ...getFloorColor(idx),
    }));
  }, [latestByRoom]);

  const totalSensors = useMemo(() => floors.reduce((a, f) => a + f.sensorCount, 0), [floors]);

  const historyByFloor = usePzemHistoryByFloor(latestByRoom);

  const refreshTopStats = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const [alertsRes, usersRes] = await Promise.all([
        fetch(`${BACK_API_URL}/alerts?today=1&count=1`),
        fetch(`${BACK_API_URL}/users`, { headers }),
      ]);

      const [alertsJson, usersJson] = await Promise.all([
        alertsRes.ok ? alertsRes.json() : [],
        usersRes.ok ? usersRes.json() : [],
      ]);

      const alerts = Array.isArray(alertsJson) ? alertsJson : [];
      const users = Array.isArray(usersJson) ? usersJson : [];
      setTodayAlertCount(Number.isFinite(Number(alertsJson?.count))
        ? Number(alertsJson.count)
        : alerts.filter((alert) => isToday(alert.createdAt)).length);
      setOnlineUsers({
        current: users.filter((user) => String(user.status).toLowerCase() === 'online').length,
        total: users.length,
      });
    } catch (err) {
      console.warn('[AdminDashboard] Failed to refresh top stats:', err.message);
    }
  }, []);

  useEffect(() => {
    refreshTopStats();
    const timer = setInterval(refreshTopStats, 30_000);
    return () => clearInterval(timer);
  }, [refreshTopStats]);

  useEffect(() => {
    const handleNewAlert = (alert) => {
      if (isToday(alert?.createdAt ?? Date.now())) {
        setTodayAlertCount((count) => count + 1);
      }
    };
    const handleUserStatusChange = () => refreshTopStats();

    socket.on('Adashboard-update', (data) => {
      if (data?.stats) {
        setSocketStats(prev => ({
          activeStations: { ...prev.activeStations, ...(data.stats.activeStations ?? {}) },
          alerts:         { ...prev.alerts,         ...(data.stats.alerts         ?? {}) },
        }));
      }
    });
    socket.on('new-alert', handleNewAlert);
    socket.on('user:statusChange', handleUserStatusChange);
    return () => {
      socket.off('Adashboard-update');
      socket.off('new-alert', handleNewAlert);
      socket.off('user:statusChange', handleUserStatusChange);
    };
  }, [refreshTopStats]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Dashboard</Text>
          <Text style={styles.pageSubtitle}>Welcome back! Here's what's happening today.</Text>
        </View>

        <TopStatsRow
          floors={floors}
          totalSensors={totalSensors}
          todayAlertCount={todayAlertCount}
          onlineUsers={onlineUsers}
        />

        <Text style={styles.sectionTitle}>Building Floors</Text>
        {floors.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Waiting for floor data…</Text>
          </View>
        ) : (
          floors.map(floor => (
            <FloorDetailCard key={floor.label} floor={floor} latestByRoom={latestByRoom} />
          ))
        )}

        <PzemMultiFloorCard
          floors={floors}
          historyByFloor={historyByFloor}
          latestByRoom={latestByRoom}
        />

        <IotDistributionCard />

      </ScrollView>
    </SafeAreaView>
  );
};

const chartStyles = StyleSheet.create({
  floorFilters: { flexDirection: 'row', gap: 8, paddingBottom: 4, paddingTop: 2 },
  floorPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5,
  },
  floorPillDot:   { width: 6, height: 6, borderRadius: 3 },
  floorPillText:  { fontSize: 12, fontWeight: '600' },
  floorPillAlert: { marginLeft: 2 },

  pzemLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  legendChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1.5,
  },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, fontWeight: '600' },

  chartEmpty: {
    height: 140, alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 12, marginTop: 12,
  },
  chartEmptyText: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },

  pzemChartWrap: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingBottom: 4, paddingTop: 8, minWidth: '100%',
  },
  pzemYLabel:   { fontSize: 10, color: '#9CA3AF', marginRight: 4, marginBottom: 24, alignSelf: 'flex-end' },
  pzemBarsArea: { flexDirection: 'row', alignItems: 'flex-end', height: 160 },
  pzemSlot: {
    alignItems: 'center', marginHorizontal: 4,
    height: '100%', justifyContent: 'flex-end',
  },
  pzemBarGroup:  { flexDirection: 'row', alignItems: 'flex-end', height: '85%' },
  pzemBar:       { minHeight: 4 },
  pzemBarAnomaly: {
    shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 6, elevation: 6,
  },
  anomalyMarker:     { position: 'absolute', top: 0, alignItems: 'center' },
  anomalyMarkerText: { fontSize: 11, color: '#EF4444' },
  pzemTimeLabel:     { fontSize: 9, color: '#9CA3AF', marginTop: 5, textAlign: 'center' },

  pzemAnnotations: {
    flexDirection: 'row', justifyContent: 'center',
    alignItems: 'center', gap: 10, marginTop: 16, flexWrap: 'wrap',
  },
  annotationChip: {
    flex: 1, minWidth: 60, height: 70,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 4, paddingHorizontal: 6,
    borderRadius: 12, borderWidth: 1.5,
  },
  annotationVal: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});

/* ══════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  safeArea:      { flex: 1, backgroundColor: '#F8F7FC' },
  scrollContent: { flexGrow: 1, paddingTop: 20, paddingBottom: 60, paddingHorizontal: 16 },

  pageHeader:   { marginBottom: 22 },
  pageTitle:    { fontSize: 30, fontWeight: '700', color: '#111827', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, color: '#6B7280' },

  emptyState:     { paddingVertical: 32, alignItems: 'center' },
  emptyStateText: { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },

  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#374151',
    textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12,
  },

  topStatsRow:  { flexDirection: 'row', gap: 10, marginBottom: 28 },
  topStatCard:  {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingVertical: 14, paddingHorizontal: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  topStatIcon:  { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  topStatValue: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 2 },
  topStatLabel: { fontSize: 11, fontWeight: '600', color: '#374151', marginBottom: 2 },
  topStatSub:   { fontSize: 10, color: '#9CA3AF', textAlign: 'center' },

  floorDetailCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, marginBottom: 14,
    borderWidth: 1, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 10, elevation: 2,
  },
  floorDetailAccent:  { height: 4 },
  floorDetailHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  floorDetailBadge:   { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  floorDetailShort:   { fontSize: 14, fontWeight: '700' },
  floorDetailName:    { fontSize: 16, fontWeight: '700', color: '#111827' },
  floorDetailMeta:    { fontSize: 11, color: '#6B7280', marginTop: 3 },
  floorDetailRight:   { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 },
  floorMiniChip:      { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },

  floorRoomsPanel:    { paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, borderTopWidth: 1 },

  roomCard:        { backgroundColor: '#FAFAFA', borderRadius: 14, marginBottom: 8, borderWidth: 1, overflow: 'hidden' },
  roomAccentBar:   { height: 2 },
  roomCardHeader:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  roomStatusDot:   { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  roomName:        { fontSize: 13, fontWeight: '600', color: '#111827' },
  roomMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  roomMetaText:    { fontSize: 10, color: '#9CA3AF' },
  metaDivider:     { width: 1, height: 8, backgroundColor: '#E5E7EB' },
  liveIndicator:   { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10b981' },
  roomStatusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },

  sensorPanel:     { paddingHorizontal: 12, paddingBottom: 10, paddingTop: 8, borderTopWidth: 1 },
  sensorRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 6, gap: 10 },
  sensorIconWrap:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sensorMiddle:    { flex: 1 },
  sensorLabel:     { fontSize: 11, fontWeight: '600', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.4 },
  sensorStatus:    { fontSize: 10, marginTop: 1 },
  sensorValue:     { fontSize: 13, fontWeight: '700', flexShrink: 0 },
  noSensorText:    { fontSize: 12, color: '#9ca3af', fontStyle: 'italic', paddingVertical: 8, textAlign: 'center' },
  sensorPanelFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  roomFooterText:  { fontSize: 10, color: '#9CA3AF' },
  roomFooterTime:  { fontSize: 10, color: '#9CA3AF' },

  chartCard:       { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 16, marginTop: 8 },
  chartHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  chartTitle:      { fontSize: 16, fontWeight: '600', color: '#111827' },
  chartPlaceholder:{ height: 180, backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  donutChart:      { width: 140, height: 140, borderRadius: 70, borderWidth: 28, borderColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: 14 },
  donutValue:      { fontSize: 22, fontWeight: '700', color: '#111827' },
  donutLabel:      { fontSize: 10, color: '#6B7280' },
  energyStats:     { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  energyStat:      { alignItems: 'center', flex: 1, paddingVertical: 12, backgroundColor: '#F8F7FC', borderRadius: 12, marginHorizontal: 4 },
  energyStatLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  energyStatValue: { fontSize: 17, fontWeight: '600' },
  donutWrapper: {
  justifyContent: 'center',
  alignItems: 'center',
},

donutContainer: {
  width: 150,
  height: 150,
  justifyContent: 'center',
  alignItems: 'center',
  position: 'relative',
},

donutSegment: {
  position: 'absolute',
  width: 150,
  height: 150,
  borderRadius: 75,
  borderWidth: 18,
  borderTopColor: 'transparent',
  borderLeftColor: 'transparent',
},

donutCenter: {
  position: 'absolute',
  width: 90,
  height: 90,
  borderRadius: 45,
  backgroundColor: '#FFFFFF',
  justifyContent: 'center',
  alignItems: 'center',
},

donutValue: {
  fontSize: 24,
  fontWeight: '700',
  color: '#111827',
},

donutLabel: {
  fontSize: 11,
  color: '#6B7280',
},
});

export default AdminDashboard;
