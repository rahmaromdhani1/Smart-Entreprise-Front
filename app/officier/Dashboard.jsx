import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from 'socket.io-client';
import {
  Zap,
  Thermometer,
  Sun,
  Droplets,
  Wind,
  Activity,
  Briefcase,
  AlertTriangle,
} from 'lucide-react-native';
import { useSensorSocket } from '../../hook/useSensorSocket';

/* ══════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════ */
const SERVER_URL = 'http://172.28.40.165:5000';

const PZEM_CHART_ONLY_KEYS = new Set([
  'voltage', 'current', 'power', 'frequency', 'power_factor',
]);

const PZEM_METRICS = ['voltage', 'current', 'power', 'frequency', 'power_factor'];

const PZEM_CONFIG = {
  voltage:      { label: 'Voltage',    unit: 'V',  color: '#6366F1', gradientColors: ['#6366F1', '#818CF8'], bgColor: 'rgba(99,102,241,0.12)'  },
  current:      { label: 'Current',    unit: 'A',  color: '#10B981', gradientColors: ['#10B981', '#34D399'], bgColor: 'rgba(16,185,129,0.12)'  },
  power:        { label: 'Power',      unit: 'W',  color: '#F59E0B', gradientColors: ['#F59E0B', '#FCD34D'], bgColor: 'rgba(245,158,11,0.12)'  },
  frequency:    { label: 'Frequency',  unit: 'Hz', color: '#A78BFA', gradientColors: ['#A78BFA', '#C4B5FD'], bgColor: 'rgba(167,139,250,0.12)' },
  power_factor: { label: 'Pwr Factor', unit: '',   color: '#EC4899', gradientColors: ['#EC4899', '#F9A8D4'], bgColor: 'rgba(236,72,153,0.12)'  },
};

const PZEM_DISPLAY_MAX = {
  voltage: 260, current: 20, power: 5000, frequency: 60, power_factor: 1,
};

const normalize = (type, value) => {
  const max = PZEM_DISPLAY_MAX[type] ?? 100;
  return Math.max(2, Math.min(100, Math.round((value / max) * 100)));
};

/* ══════════════════════════════════════════════════
   DONUT COLORS
══════════════════════════════════════════════════ */
const DONUT_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#06B6D4', '#EF4444', '#EC4899', '#3B82F6'];
const getDonutColor = (index) => DONUT_COLORS[index % DONUT_COLORS.length];

/* ══════════════════════════════════════════════════
   SENSOR CATALOG
══════════════════════════════════════════════════ */
const SENSOR_CATALOG = {
  temperature: {
    label: 'Temperature',
    icon: (c) => <Thermometer size={20} color={c} />,
    iconColor: '#EF4444', iconBg: 'rgba(239,68,68,0.10)',
    format: (v) => `${Number(v).toFixed(1)} °C`,
    status: (v) => (v > 28 ? '⚠ High' : v < 18 ? '⚠ Low' : '✓ Normal'),
    statusColor: (v) => (v > 28 || v < 18 ? '#EF4444' : '#10B981'),
  },
  energy: {
    label: 'Energy',
    icon: (c) => <Zap size={20} color={c} />,
    iconColor: '#8B5CF6', iconBg: 'rgba(139,92,246,0.10)',
    format: (v, unit) => `${Number(v).toFixed(3)} ${unit ?? 'kWh'}`,
    status: () => '↓ vs last month',
    statusColor: () => '#10B981',
  },
  light: {
    label: 'Light Level',
    icon: (c) => <Sun size={20} color={c} />,
    iconColor: '#F59E0B', iconBg: 'rgba(245,158,11,0.10)',
    format: (v, unit) => `${Number(v).toFixed(0)} ${unit ?? 'lux'}`,
    status: (v) => (v > 800 ? '☀ Very bright' : v > 400 ? '🌤 Bright' : '🌑 Low'),
    statusColor: () => '#6B7280',
  },
  humidity: {
    label: 'Humidity',
    icon: (c) => <Droplets size={20} color={c} />,
    iconColor: '#3B82F6', iconBg: 'rgba(59,130,246,0.10)',
    format: (v) => `${Number(v).toFixed(1)} %`,
    status: (v) => (v > 70 ? '⚠ Humid' : v < 30 ? '⚠ Dry' : '✓ Normal'),
    statusColor: (v) => (v > 70 || v < 30 ? '#F59E0B' : '#10B981'),
  },
  smoke: {
    label: 'Smoke / Gas',
    icon: (c) => <Wind size={20} color={c} />,
    iconColor: '#F59E0B', iconBg: 'rgba(245,158,11,0.10)',
    format: (v) => `${Number(v).toFixed(1)} ppm`,
    status: (v) => (v > 0 ? '⚠ Alert' : '✓ Clear'),
    statusColor: (v) => (v > 0 ? '#EF4444' : '#10B981'),
  },
  motion: {
    label: 'Motion',
    icon: (c) => <Activity size={20} color={c} />,
    iconColor: '#10B981', iconBg: 'rgba(16,185,129,0.10)',
    format: (v) => (v === 1 || v === '1' ? 'Detected' : 'None'),
    status: (v) => (v === 1 || v === '1' ? '🟢 Active' : '⚪ Idle'),
    statusColor: () => '#6B7280',
  },
};

const ROOM_META_KEYS = new Set(['floor', 'room']);

/* ══════════════════════════════════════════════════
   SENSOR CARD
══════════════════════════════════════════════════ */
function SensorCard({ sensorKey, sensorData }) {
  const cfg = SENSOR_CATALOG[sensorKey];
  if (!cfg) return null;
  const { value, unit } = sensorData ?? {};
  const displayValue  = value != null ? cfg.format(value, unit) : '--';
  const displayStatus = value != null ? cfg.status(value) : '--';
  const statusColor   = value != null ? cfg.statusColor(value) : '#6B7280';
  return (
    <View style={styles.statCard}>
      <LinearGradient colors={['#8B5CF6', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.statCardBorder} />
      <View style={styles.statHeader}>
        <Text style={styles.statHeaderText}>{cfg.label}</Text>
        <View style={[styles.statIcon, { backgroundColor: cfg.iconBg }]}>
          {cfg.icon(cfg.iconColor)}
        </View>
      </View>
      <Text style={styles.statValue}>{displayValue}</Text>
      <View style={styles.statChange}>
        <Text style={[styles.statChangeLabel, { color: statusColor }]}>{displayStatus}</Text>
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════
   PZEM BAR CHART
══════════════════════════════════════════════════ */
function PzemBarChart({ data, liveValues }) {
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
  const barWidth       = visibleMetrics.length <= 2 ? 14 : visibleMetrics.length === 3 ? 11 : visibleMetrics.length === 4 ? 9 : 7;

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>Energy Consumption</Text>
        <Text style={{ fontSize: 11, color: '#9CA3AF' }}>30 min history · PZEM</Text>
        <View style={styles.pzemLegend}>
          {PZEM_METRICS.map((key) => {
            const cfg    = PZEM_CONFIG[key];
            const active = activeMetrics.has(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.legendChip, { borderColor: cfg.color, backgroundColor: active ? cfg.bgColor : 'transparent' }]}
                onPress={() => toggleMetric(key)}
              >
                <View style={[styles.legendDot, { backgroundColor: active ? cfg.color : '#D1D5DB' }]} />
                <Text style={[styles.legendLabel, { color: active ? cfg.color : '#9CA3AF' }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {slots.length === 0 ? (
        <View style={styles.chartEmpty}>
          <Zap size={28} color="#D1D5DB" />
          <Text style={styles.chartEmptyText}>Waiting for PZEM data…</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.pzemChartWrap}>
            <Text style={styles.pzemYLabel}>%</Text>
            <View style={styles.pzemBarsArea}>
              {slots.map((slot, si) => (
                <View key={si} style={styles.pzemSlot}>
                  <View style={styles.pzemBarGroup}>
                    {visibleMetrics.map((key) => {
                      const cfg       = PZEM_CONFIG[key];
                      const val       = slot[key];
                      const h         = val != null ? normalize(key, val) : 0;
                      const isAnomaly = key === 'current' && slot._anomaly;
                      return (
                        <View key={key} style={{ marginHorizontal: 1 }}>
                          <LinearGradient
                            colors={isAnomaly ? ['#EF4444', '#F87171'] : cfg.gradientColors}
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                            style={[styles.pzemBar, { width: barWidth, height: `${h}%`, borderRadius: 4 }, isAnomaly && styles.pzemBarAnomaly]}
                          />
                        </View>
                      );
                    })}
                  </View>
                  {slot._anomaly && (
                    <View style={styles.anomalyMarker}>
                      <Text style={styles.anomalyMarkerText}>⚠</Text>
                    </View>
                  )}
                  <Text style={styles.pzemTimeLabel}>{slot.time}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      <View style={styles.pzemAnnotations}>
        {PZEM_METRICS.filter((m) => activeMetrics.has(m)).map((key) => {
          const cfg      = PZEM_CONFIG[key];
          const fromSlot = slots.length ? slots[slots.length - 1][key] : null;
          const latest   = liveValues?.[key] ?? fromSlot;
          const display  = latest != null ? `${Number(latest).toFixed(2)}${cfg.unit ? ' ' + cfg.unit : ''}` : '--';
          return (
            <View key={key} style={[styles.annotationChip, { backgroundColor: cfg.bgColor, borderColor: cfg.color }]}>
              <Text style={[styles.annotationVal, { color: cfg.color }]}>{display}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════
   IOT DISTRIBUTION CARD
   Affiche uniquement les devices du floor + room
   assignés au compte staff (depuis userData).
   Pas de filtre UI — scope fixé par le compte.
══════════════════════════════════════════════════ */
function IotDistributionCard({ staffFloor, staffRoom }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${SERVER_URL}/api/equipment`)
      .then(r => r.json())
      .then(data => {
        setDevices(Array.isArray(data) ? data : (data.data ?? []));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Filter strictly to staff's floor AND room from their account
  const filteredDevices = useMemo(() => {
    return devices.filter(d => {
      const floorOk = staffFloor ? d.floor === staffFloor : true;
      const roomOk  = staffRoom  ? d.room  === staffRoom  : true;
      return floorOk && roomOk;
    });
  }, [devices, staffFloor, staffRoom]);

  const total = filteredDevices.length;

  const groups = useMemo(() => {
    const map = {};
    filteredDevices.forEach(d => {
      const key = d.icon ?? 'lighting';
      if (!map[key]) map[key] = 0;
      map[key] += 1;
    });
    return Object.entries(map)
      .map(([icon, count], index) => ({
        label: icon.charAt(0).toUpperCase() + icon.slice(1),
        count,
        pct: total > 0 ? Math.round((count / total) * 100) : 0,
        color: getDonutColor(index),
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredDevices, total]);

  return (
    <View style={styles.chartCardSmall}>
      {/* Header — scope badge floor › room, lecture seule */}
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>IoT Distribution</Text>
        {(staffFloor || staffRoom) && (
          <View style={styles.iotScopeBadge}>
            {staffFloor && <Text style={styles.iotScopeText}>{staffFloor}</Text>}
            {staffFloor && staffRoom && <Text style={styles.iotScopeSep}>›</Text>}
            {staffRoom  && <Text style={[styles.iotScopeText, styles.iotScopeRoom]}>{staffRoom}</Text>}
          </View>
        )}
      </View>

      {/* Donut */}
      {loading ? (
        <View style={styles.chartPlaceholder}>
          <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Loading…</Text>
        </View>
      ) : (
        <View style={styles.chartPlaceholder}>
          <View style={styles.donutWrapper}>
            <View style={styles.donutContainer}>
              {groups.length > 0 ? (
                groups.map((g, index) => (
                  <View
                    key={g.label}
                    style={[
                      styles.donutSegment,
                      { borderColor: g.color, transform: [{ rotate: `${index * (360 / groups.length)}deg` }] },
                    ]}
                  />
                ))
              ) : (
                <View style={[styles.donutSegment, { borderColor: '#E5E7EB' }]} />
              )}
              <View style={styles.donutCenter}>
                <Text style={styles.donutValue}>{total}</Text>
                <Text style={styles.donutLabel}>Modules</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Stats chips */}
      {groups.length > 0 && (
        <>
          <View style={styles.energyStats}>
            {groups.slice(0, 3).map((g) => (
              <View key={g.label} style={styles.energyStat}>
                <Text style={styles.energyStatLabel}>{g.label}</Text>
                <Text style={[styles.energyStatValue, { color: g.color }]}>
                  {g.count} <Text style={{ fontSize: 12 }}>({g.pct}%)</Text>
                </Text>
              </View>
            ))}
            {groups.length < 3 && Array.from({ length: 3 - groups.length }).map((_, i) => (
              <View key={`pad-${i}`} style={styles.energyStat} />
            ))}
          </View>
          {groups.length > 3 && (
            <View style={[styles.energyStats, { marginTop: 8 }]}>
              {groups.slice(3, 6).map((g) => (
                <View key={g.label} style={styles.energyStat}>
                  <Text style={styles.energyStatLabel}>{g.label}</Text>
                  <Text style={[styles.energyStatValue, { color: g.color }]}>
                    {g.count} <Text style={{ fontSize: 12 }}>({g.pct}%)</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Empty state */}
      {!loading && total === 0 && (
        <View style={styles.iotEmptyState}>
          <Text style={styles.iotEmptyText}>No devices found in your workspace</Text>
        </View>
      )}
    </View>
  );
}

/* ══════════════════════════════════════════════════
   SOCKET (singleton)
══════════════════════════════════════════════════ */
const socket = io(SERVER_URL);

/* ══════════════════════════════════════════════════
   PZEM HISTORY HOOK
══════════════════════════════════════════════════ */
function usePzemHistory(liveRoom) {
  const [slots, setSlots] = useState([]);
  const lastSlotRef       = useRef(null);

  useEffect(() => {
    if (!liveRoom) return;
    const now   = new Date();
    const m     = now.getMinutes() < 30 ? 0 : 30;
    const label = `${String(now.getHours()).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    if (label === lastSlotRef.current) return;
    lastSlotRef.current = label;

    const voltage      = liveRoom.voltage?.value      ?? null;
    const current      = liveRoom.current?.value      ?? null;
    const power        = liveRoom.power?.value        ?? null;
    const frequency    = liveRoom.frequency?.value    ?? null;
    const power_factor = liveRoom.power_factor?.value ?? null;

    setSlots((prev) => {
      const last  = prev[prev.length - 1];
      let anomaly = false;
      if (last?.current != null && current != null && last.current !== 0) {
        anomaly = Math.abs(current - last.current) / last.current > 0.30;
      }
      return [...prev, { time: label, voltage, current, power, frequency, power_factor, _anomaly: anomaly }].slice(-16);
    });
  }, [liveRoom]);

  return slots;
}

/* ══════════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════════ */
const DashboardPage = ({ userData }) => {
  const [stats, setStats] = useState({
    activeStations: { current: 0, total: 0, percentage: 0 },
    alerts:         { count: 0, change: 0 },
  });

  // Scope du staff extrait depuis son compte
  const staffFloor = userData?.floor ?? null;
  const staffRoom  = userData?.room  ?? null;

  const { latestByRoom } = useSensorSocket();

  const liveRoom = useMemo(() => {
    const rooms = Object.values(latestByRoom);
    return rooms.length ? rooms[0] : null;
  }, [latestByRoom]);

  const pzemSlots = usePzemHistory(liveRoom);

  const liveValues = useMemo(() => {
    if (!liveRoom) return null;
    return {
      voltage:      liveRoom.voltage?.value      ?? null,
      current:      liveRoom.current?.value      ?? null,
      power:        liveRoom.power?.value        ?? null,
      frequency:    liveRoom.frequency?.value    ?? null,
      power_factor: liveRoom.power_factor?.value ?? null,
    };
  }, [liveRoom]);

  const activeSensorKeys = useMemo(() => {
    if (!liveRoom) return [];
    return Object.keys(liveRoom).filter(
      (key) => !ROOM_META_KEYS.has(key) && !PZEM_CHART_ONLY_KEYS.has(key) && SENSOR_CATALOG[key] != null,
    );
  }, [liveRoom]);

  const dynamicAlertCount = useMemo(() => {
    if (!liveRoom) return stats.alerts.count;
    const hasSmoke   = liveRoom.smoke?.value > 0;
    const hasHeat    = liveRoom.temperature?.value > 35;
    const hasAnomaly = pzemSlots.length > 0 && pzemSlots[pzemSlots.length - 1]._anomaly;
    return hasSmoke || hasHeat || hasAnomaly ? 1 : 0;
  }, [liveRoom, stats.alerts.count, pzemSlots]);

  useEffect(() => {
    socket.on('dashboard-update', (data) => {
      if (data?.stats) {
        setStats((prev) => ({
          activeStations: { ...prev.activeStations, ...(data.stats.activeStations ?? {}) },
          alerts:         { ...prev.alerts,         ...(data.stats.alerts         ?? {}) },
        }));
      }
    });
    return () => socket.off('dashboard-update');
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>Overview of your system</Text>
      </View>

      <View style={styles.dashboardGrid}>
        {activeSensorKeys.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>Waiting for sensor data…</Text>
          </View>
        ) : (
          activeSensorKeys.map((key) => (
            <SensorCard key={key} sensorKey={key} sensorData={liveRoom[key]} />
          ))
        )}

        {/* Active Positions */}
        <View style={styles.statCard}>
          <LinearGradient colors={['#8B5CF6', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.statCardBorder} />
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderText}>Active Positions</Text>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(16,185,129,0.10)' }]}>
              <Briefcase size={20} color="#10B981" />
            </View>
          </View>
          <Text style={styles.statValue}>{stats.activeStations.current}/{stats.activeStations.total}</Text>
          <View style={styles.statChange}>
            <Text style={styles.statChangeLabel}>{stats.activeStations.percentage}% occupation</Text>
          </View>
        </View>

        {/* Active Alerts */}
        <View style={styles.statCard}>
          <LinearGradient colors={['#8B5CF6', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.statCardBorder} />
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderText}>Active Alerts</Text>
            <View style={[styles.statIcon, { backgroundColor: 'rgba(245,158,11,0.10)' }]}>
              <AlertTriangle size={20} color="#F59E0B" />
            </View>
          </View>
          <Text style={styles.statValue}>{dynamicAlertCount}</Text>
          <View style={styles.statChange}>
            <Text style={[styles.statChangeLabel, { color: '#EF4444' }]}>+{stats.alerts.change} today</Text>
          </View>
        </View>
      </View>

      <View style={styles.chartsSection}>
        <PzemBarChart data={pzemSlots} liveValues={liveValues} />

        {/* IoT Distribution — scoped strictly to staff's floor + room */}
        <IotDistributionCard staffFloor={staffFloor} staffRoom={staffRoom} />
      </View>
    </ScrollView>
  );
};

/* ══════════════════════════════════════════════════
   STYLES
══════════════════════════════════════════════════ */
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F8F7FC' },
  pageHeader:   { marginBottom: 32, paddingHorizontal: 24, paddingTop: 24 },
  pageTitle:    { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  pageSubtitle: { fontSize: 16, color: '#6B7280' },

  dashboardGrid:  { paddingHorizontal: 24, marginBottom: 32 },
  emptyState:     { paddingVertical: 40, alignItems: 'center' },
  emptyStateText: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },

  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 24, borderRadius: 16,
    shadowColor: '#f65cf1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
    marginBottom: 24, position: 'relative', overflow: 'hidden',
  },
  statCardBorder: { position: 'absolute', top: 0, left: 0, width: 4, height: '100%' },
  statHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statHeaderText: { fontSize: 14, color: '#6B7280', fontWeight: '500', flex: 1 },
  statIcon:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue:      { fontSize: 36, fontWeight: '700', color: '#111827', marginBottom: 8 },
  statChange:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statChangeLabel:{ fontSize: 13, color: '#6B7280' },

  chartsSection: { paddingHorizontal: 16, marginBottom: 32 },

  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 24, borderRadius: 16,
    shadowColor: '#f65cf1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
    marginBottom: 24,marginTop: 8,
  },
  chartCardSmall: {
    backgroundColor: '#FFFFFF',
    padding: 28, borderRadius: 16,
    shadowColor: '#f65cf1', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 4,
  },
  chartHeader: {
    marginBottom: 16,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', flexWrap: 'wrap', gap: 6,
  },
  chartTitle: { fontSize: 18, fontWeight: '600', color: '#111827' },

  /* Scope badge — read-only, shows floor › room from userData */
  iotScopeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(139,92,246,0.10)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
  },
  iotScopeText: { fontSize: 11, fontWeight: '600', color: '#8B5CF6' },
  iotScopeSep:  { fontSize: 11, color: '#C4B5FD' },
  iotScopeRoom: { color: '#6D28D9' },

  chartEmpty:     { height: 180, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 12 },
  chartEmptyText: { fontSize: 13, color: '#9CA3AF', marginTop: 6 },

  pzemLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  legendChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1.5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel:{ fontSize: 12, fontWeight: '600' },

  pzemChartWrap:  { flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 4, paddingTop: 8, minWidth: '100%' },
  pzemYLabel:     { fontSize: 10, color: '#9CA3AF', marginRight: 4, marginBottom: 24, alignSelf: 'flex-end' },
  pzemBarsArea:   { flexDirection: 'row', alignItems: 'flex-end', height: 180 },
  pzemSlot:       { alignItems: 'center', marginHorizontal: 4, height: '100%', justifyContent: 'flex-end' },
  pzemBarGroup:   { flexDirection: 'row', alignItems: 'flex-end', height: '85%' },
  pzemBar:        { minHeight: 4 },
  pzemBarAnomaly: { shadowColor: '#EF4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6, elevation: 6 },
  anomalyMarker:     { position: 'absolute', top: 0, alignItems: 'center' },
  anomalyMarkerText: { fontSize: 11, color: '#EF4444' },
  pzemTimeLabel:     { fontSize: 9, color: '#9CA3AF', marginTop: 5, textAlign: 'center' },

  pzemAnnotations: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20, flexWrap: 'wrap' },
  annotationChip:  { flex: 1, minWidth: 65, width: 95, height: 80, alignItems: 'center', justifyContent: 'center', paddingVertical: 5, paddingHorizontal: 8, borderRadius: 12, borderWidth: 1.5, gap: 4 },
  annotationVal:   { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  /* Donut */
  chartPlaceholder: { height: 220, backgroundColor: 'rgba(139,92,246,0.04)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 4 },
  donutWrapper:     { justifyContent: 'center', alignItems: 'center' },
  donutContainer:   { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  donutSegment:     { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 18, borderTopColor: 'transparent', borderLeftColor: 'transparent' },
  donutCenter:      { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  donutValue:       { fontSize: 24, fontWeight: '700', color: '#111827' },
  donutLabel:       { fontSize: 11, color: '#6B7280' },

  /* Energy stats chips */
  energyStats:     { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  energyStat:      { alignItems: 'center', flex: 1, paddingVertical: 16, backgroundColor: '#F8F7FC', borderRadius: 12, marginHorizontal: 4 },
  energyStatLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  energyStatValue: { fontSize: 18, fontWeight: '600' },

  /* IoT empty state */
  iotEmptyState: { paddingVertical: 16, alignItems: 'center' },
  iotEmptyText:  { fontSize: 13, color: '#9CA3AF', fontStyle: 'italic' },
});

export default DashboardPage;