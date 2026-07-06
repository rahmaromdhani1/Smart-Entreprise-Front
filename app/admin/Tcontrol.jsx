import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  Settings, SlidersHorizontal, Server, WifiOff,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Lock, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity, PlugZap,
  Bell, Waves, Fan, Zap, Power,
} from 'lucide-react-native';

import AddEquipment   from './AddEquipment';
import EquipmentList  from './equipementList';
import ManageSeuils   from './manageSeuil';
import {
  getEquipments,
  updateEquipment,
  deleteEquipment,
  getLiveDeviceStatuses,
} from '../../Service/EquipmentApi';
import { getAllSeuilProfiles } from '../../Service/SeuilApi';
import { useActuatorSync }    from '../../hook/Useactuatorsync ';

// ─── Constants ────────────────────────────────────────────────────────────────

const SENSOR_CONFIG = {
  temperature: { min: -50,   max: 150,    unit: '°C',  label: 'Temperature' },
  light:       { min: 0,     max: 200000, unit: 'lux', label: 'Light'       },
  humidity:    { min: 0,     max: 100,    unit: '%',   label: 'Humidity'    },
  pressure:    { min: 300,   max: 1100,   unit: 'hPa', label: 'Pressure'    },
  co2:         { min: 0,     max: 50000,  unit: 'ppm', label: 'CO₂'         },
  motion:      { min: 0,     max: 1,      unit: '0/1', label: 'Motion'      },
  energy:      { min: 0,     max: 100000, unit: 'kWh', label: 'Energy'      },
};

const NODE_ICONS = [
  { value: 'lighting', Icon: Lightbulb, color: '#F59E0B' },
  { value: 'hvac',     Icon: Wind,      color: '#0EA5E9' },
  { value: 'cameras',  Icon: Video,     color: '#6366F1' },
  { value: 'access',   Icon: Lock,      color: '#10B981' },
  { value: 'fire',     Icon: Flame,     color: '#EF4444' },
  { value: 'water',    Icon: Droplet,   color: '#3B82F6' },
  { value: 'energy',   Icon: PlugZap,   color: '#F59E0B' },
];

const SENSOR_TYPES = [
  { value: 'temperature', Icon: Thermometer, color: '#EF4444' },
  { value: 'light',       Icon: Sun,         color: '#F59E0B' },
  { value: 'humidity',    Icon: Droplets,    color: '#3B82F6' },
  { value: 'pressure',    Icon: Gauge,       color: '#8B5CF6' },
  { value: 'co2',         Icon: Wind,        color: '#06B6D4' },
  { value: 'motion',      Icon: Activity,    color: '#6366F1' },
  { value: 'energy',      Icon: PlugZap,     color: '#F59E0B' },
  { value: 'general',     Icon: Power,       color: '#94A3B8' },
];

// Full actuator catalog per sensor type (includes 'general' fallback)
const SENSOR_ACTUATOR_DEFAULTS = {
  temperature: [
    { type: 'fan_ac',      label: 'Fan Clim',       IconComp: Fan,   iconColor: '#0EA5E9', controlType: 'slider', min: 0, max: 255, default: 0 },
    { type: 'fan_heat',    label: 'Fan Chauffage',   IconComp: Fan,   iconColor: '#EF4444', controlType: 'slider', min: 0, max: 255, default: 0 },
  ],
  humidity: [    { type: 'fan_ac',      label: 'Fan Clim',       IconComp: Fan,   iconColor: '#0EA5E9', controlType: 'slider', min: 0, max: 255, default: 0 },
],   
  smoke: [
    { type: 'fan_exhaust', label: 'Fan Aspiration',  IconComp: Fan,   iconColor: '#06B6D4', controlType: 'slider', min: 0, max: 255, default: 0 },
    { type: 'buzzer',      label: 'Buzzer',          IconComp: Bell,  iconColor: '#EF4444', controlType: 'toggle' },
    { type: 'speaker',     label: 'Speaker',         IconComp: Waves, iconColor: '#F97316', controlType: 'tone',   frequency: 1000 },
  ],
  light: [
    { type: 'led_strip',   label: 'LED Strip',       IconComp: Zap,   iconColor: '#F59E0B', controlType: 'led',    min: 0, max: 255, default: 0 },
    { type: 'blind_motor', label: 'Blind Motor',     IconComp: Power, iconColor: '#8B5CF6', controlType: 'toggle' },
  ],
  motion: [
    { type: 'led_strip',   label: 'LED Strip',       IconComp: Zap,   iconColor: '#F59E0B', controlType: 'led',    min: 0, max: 255, default: 0 },  ],
  general: [
    { type: 'fan_ac',      label: 'Fan Clim',        IconComp: Fan,   iconColor: '#0EA5E9', controlType: 'slider', min: 0, max: 255, default: 0 },
    { type: 'fan_heat',    label: 'Fan Chauffage',   IconComp: Fan,   iconColor: '#EF4444', controlType: 'slider', min: 0, max: 255, default: 0 },
    { type: 'fan_exhaust', label: 'Fan Aspiration',  IconComp: Fan,   iconColor: '#06B6D4', controlType: 'slider', min: 0, max: 255, default: 0 },
    { type: 'led_strip',   label: 'LED Strip',       IconComp: Zap,   iconColor: '#F59E0B', controlType: 'led',    min: 0, max: 255, default: 0 },
    { type: 'blind_motor', label: 'Blind Motor',     IconComp: Power, iconColor: '#8B5CF6', controlType: 'toggle' },
    { type: 'buzzer',      label: 'Buzzer',          IconComp: Bell,  iconColor: '#EF4444', controlType: 'toggle' },
    { type: 'speaker',     label: 'Speaker',         IconComp: Waves, iconColor: '#F97316', controlType: 'tone',   frequency: 1000 },
  ],
};

const normalizeStatusKey = (value) =>
  String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const getEquipmentStatusKeys = (equipment) => [
  normalizeStatusKey(equipment?.mac),
  normalizeStatusKey(equipment?.nodeId),
  normalizeStatusKey(equipment?._id),
  normalizeStatusKey(equipment?.id),
].filter(Boolean);

/** Render the correct icon for a given equipment icon key */
const NodeIcon = ({ iconKey, size = 24 }) => {
  const found = NODE_ICONS.find((n) => n.value === iconKey);
  if (!found) return <Server size={size} color="#8B5CF6" />;
  const { Icon, color } = found;
  return <Icon size={size} color={color} strokeWidth={2} />;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ControlPage = ({ userData }) => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  

  // Local sensor slider values (fallback when no actuators) — keyed by `${eqId}_${sensorType}`
  const [sliderValues, setSliderValues] = useState({});

  // Modal visibility
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [showAddModal,      setShowAddModal]       = useState(false);
  const [showSeuils,        setShowSeuils]         = useState(false);

  // ── useActuatorSync — real-time actuator state via socket ─────────────────
  const buildSocketAuth = useCallback((u) => ({
    token:           u?.token ?? '',
    functionalGrade: u?.role  ?? 'user',
  }), []);

  const getCommandRoomId = useCallback((equipment) =>
    equipment.roomId ?? equipment.officeRoom ?? '*',
  []);

  const {
    getToggle,
    getSlider,
    handleToggle,
    handleSlider,
    requestActuatorStates,
    connected,
    connectedRef,
    statesLoaded,
    deviceStatus,
    syncDeviceStatusSnapshot,
    equipmentRef,
  } = useActuatorSync({
    userData,
    canSendCommand:  true,
    buildSocketAuth,
    getCommandRoomId,
  });

  // Keep equipmentRef in sync with list
  useEffect(() => { equipmentRef.current = equipmentList; }, [equipmentList, equipmentRef]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEquipmentId = (eq) => eq?._id || eq?.id || '';

  const getEquipmentOnlineStatus = (equipment) => {
    const keys = getEquipmentStatusKeys(equipment);
    const liveKey = keys.find((key) => key in deviceStatus);
    if (liveKey) return deviceStatus[liveKey];
    if (typeof equipment?.isOnline === 'boolean') return equipment.isOnline;
    return String(equipment?.status || '').toLowerCase() === 'online';
  };

  const getInitialSliderValue = (sensorType) => {
    const cfg = SENSOR_CONFIG[sensorType];
    if (!cfg) return 0;
    return Math.round((cfg.min + cfg.max) / 2);
  };

  const getSensorSliderValue = (eqId, sensorType) => {
    const key = `${eqId}_${sensorType}`;
    return sliderValues[key] ?? getInitialSliderValue(sensorType);
  };

  const handleSensorSliderChange = (eqId, sensorType, value) => {
    setSliderValues((prev) => ({
      ...prev,
      [`${eqId}_${sensorType}`]: Math.round(value),
    }));
  };

  // ── Fetch equipments + seuil profiles on mount ────────────────────────────
  const loadEquipments = useCallback(async ({ showLoading = true } = {}) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      

      const [res, liveStatuses] = await Promise.all([
        getEquipments(),
        getLiveDeviceStatuses(),
      ]);
      const list = res?.data || res;
      const arr  = Array.isArray(list) ? list : [];

      equipmentRef.current = arr;
      setEquipmentList(arr);
      syncDeviceStatusSnapshot(arr, liveStatuses);

      if (connectedRef.current) {
        requestActuatorStates(arr);
      }
    } catch (err) {
      console.error('[ControlPage] fetchEquipments error:', err);
      setError('Failed to load equipments.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [connectedRef, equipmentRef, requestActuatorStates, syncDeviceStatusSnapshot]);

  // Refresh toutes les 30s pour rester sync avec MongoDB

  // Appel initial pour charger les équipements au montage
  useEffect(() => {
    loadEquipments();
  }, [loadEquipments]);

useEffect(() => {
  const interval = setInterval(() => {
    loadEquipments({ showLoading: false });
  }, 30_000);
  return () => clearInterval(interval);
}, [loadEquipments]);

  // ── CRUD handlers ─────────────────────────────────────────────────────────
  const handleAddSuccess = (newEquipment) => {
    setEquipmentList((prev) => [...prev, newEquipment]);
    setShowAddModal(false);
  };

  const handleDelete = async (id) => {
    try {
      await deleteEquipment(id);
      setEquipmentList((prev) => prev.filter((e) => getEquipmentId(e) !== id));
    } catch (err) {
      console.error('[ControlPage] deleteEquipment error:', err);
    }
  };

  const handleUpdate = async (id, updatedData) => {
    try {
      const response = await updateEquipment(id, updatedData);
      const updated  = response?.data?.equipment || response?.data || updatedData;
      setEquipmentList((prev) =>
        prev.map((e) => (getEquipmentId(e) === id ? { ...e, ...updated } : e))
      );
    } catch (err) {
      console.error('[ControlPage] updateEquipment error:', err);
      setEquipmentList((prev) =>
        prev.map((e) => (getEquipmentId(e) === id ? { ...e, ...updatedData } : e))
      );
    }
  };
const activeCount = equipmentList.filter((e) => {
  return getEquipmentOnlineStatus(e);
}).length;
const inactiveCount = equipmentList.length - activeCount;
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── Page Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>IoT Control Panel</Text>
            <Text style={styles.subtitle}>Manage and monitor all connected devices</Text>
          </View>
        </View>

        {/* ── Quick Actions ── */}
        <View style={styles.quickActions}>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setShowSeuils(true)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quickActionGradient}
            >
              <SlidersHorizontal size={22} color="#fff" />
              <Text style={styles.quickActionText}>Manage Seuils</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => setShowEquipmentList(true)}
            activeOpacity={0.7}
          >
            <View style={styles.quickActionOutline}>
              <Settings size={22} color="#8B5CF6" />
              <Text style={styles.quickActionTextOutline}>Manage Nodes</Text>
            </View>
          </TouchableOpacity>

        </View>

        {/* ── Socket offline banner ── */}
        {!connected && (
          <View style={styles.offlineBanner}>
            <WifiOff size={14} color="#fbbf24" />
            <Text style={styles.offlineBannerText}>Socket déconnecté — les commandes sont désactivées</Text>
          </View>
        )}

        {/* ── Sync banner ── */}
        {connected && !statesLoaded && equipmentList.length > 0 && (
          <View style={styles.syncBanner}>
            <ActivityIndicator size="small" color="#818CF8" style={{ marginRight: 8 }} />
            <Text style={styles.syncBannerText}>Synchronisation des états actuateurs…</Text>
          </View>
        )}

        {/* ── Loading / Error states ── */}
        {loading && (
          <View style={styles.stateBox}>
            <ActivityIndicator color="#8B5CF6" size="large" />
            <Text style={styles.stateText}>Loading equipment...</Text>
          </View>
        )}

        {error && !loading && (
          <View style={[styles.stateBox, { backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.stateText, { color: '#EF4444' }]}>{error}</Text>
          </View>
        )}

        {/* ── Control Grid ── */}
        {!loading && !error && (
          <View style={styles.controlGrid}>
            {equipmentList.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Server size={40} color="#8B5CF6" />
                </View>
                <Text style={styles.emptyTitle}>No Equipment Registered</Text>
                <Text style={styles.emptyText}>
                  Tap <Text style={{ fontWeight: '700' }}>Manage Nodes → +</Text> to add your first device.
                </Text>
              </View>
            ) : (
              equipmentList.map((equipment) => {
                const eqId    = getEquipmentId(equipment);
                const isOnline = getEquipmentOnlineStatus(equipment);

                const hasSensors  = Array.isArray(equipment.sensors) && equipment.sensors.length > 0;
                const actuators   = Array.isArray(equipment.actuators) ? equipment.actuators : [];
                const hasActuators = actuators.length > 0;

                // Group actuators by sensorType
                const grouped = actuators.reduce((acc, a) => {
                  const key = a?.sensorType || 'general';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(a);
                  return acc;
                }, {});

                return (
                  <View key={eqId} style={styles.controlCard}>

                    {/* Card Header */}
                    <View style={styles.controlHeader}>
                      <View style={styles.controlTitle}>
                        <View style={styles.controlIconBox}>
                          <NodeIcon iconKey={equipment.icon} size={24} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.deviceName}>{equipment.name}</Text>
                          <Text style={styles.deviceNodeId}>ID: {equipment.nodeId}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Status LED */}
                    <View style={styles.statusRow}>
                      <View style={[styles.led, isOnline ? styles.ledOn : styles.ledOff]} />
                      <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#6B7280' }]}>
                        {isOnline ? 'Active' : 'Inactive'}
                      </Text>
                      {!statesLoaded && (
                        <Text style={styles.syncingLabel}>synchronisation…</Text>
                      )}
                    </View>

                    {/* ── Actuator controls grouped by sensor ── */}
                    {hasActuators ? (
                      <View style={styles.actuatorSection}>
                        {Object.entries(grouped).map(([sensorType, sensorActuators]) => {
                          const sensorMeta = SENSOR_TYPES.find((s) => s.value === sensorType);
                          const SensorIcon  = sensorMeta?.Icon;
                          const sensorColor = sensorMeta?.color;

                          return (
                            <View key={sensorType} style={styles.actuatorGroup}>
                              {/* Sensor group label */}
                              <View style={styles.actuatorGroupHeader}>
                                {SensorIcon && (
                                  <SensorIcon size={13} color={sensorColor} strokeWidth={2} />
                                )}
                                <Text style={styles.actuatorGroupLabel}>
                                  {sensorType === 'general' ? 'ACTIONNEURS' : sensorType.toUpperCase()}
                                </Text>
                              </View>

                              {/* Actuator rows */}
                              {sensorActuators.map((actuator) => {
                                const catalog = SENSOR_ACTUATOR_DEFAULTS[sensorType] ?? SENSOR_ACTUATOR_DEFAULTS['general'];
                                const meta    = catalog?.find((a) => a.type === actuator.type);
                                const { IconComp, iconColor, label } = meta || {};
                                const displayLabel = label || actuator.type.replace(/_/g, ' ');
                                const ctrlType     = actuator.controlType || meta?.controlType || 'toggle';

                                const actWithCtrl = { ...actuator, controlType: ctrlType, sensorType };

                                // ── LED strip — toggle + brightness slider ──
                                if (actuator.type === 'led_strip' || ctrlType === 'led') {
                                  const brightness = getSlider(equipment.mac, actuator.type, meta?.default ?? 0);
                                  const ledOn      = getToggle(equipment.mac, actuator.type);
                                  const min = actuator.min ?? meta?.min ?? 0;
                                  const max = actuator.max ?? meta?.max ?? 255;

                                  return (
                                    <View key={`${sensorType}__${actuator.type}`} style={styles.actuatorSliderBlock}>
                                      <View style={styles.sliderLabel}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                          {IconComp && <IconComp size={14} color={iconColor} strokeWidth={2} />}
                                          <Text style={styles.actuatorLabel}>{displayLabel}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                          <Text style={[styles.sliderValue, { color: iconColor || '#8B5CF6' }]}>{brightness}</Text>
                                          <TouchableOpacity
                                            onPress={() => handleToggle(equipment, { ...actWithCtrl, controlType: 'led' })}
                                            style={[styles.toggleBtn, ledOn && styles.toggleBtnOn]}
                                            activeOpacity={0.8}
                                            disabled={!connected}
                                          >
                                            <Text style={[styles.toggleBtnText, ledOn && styles.toggleBtnTextOn]}>
                                              {ledOn ? 'ON' : 'OFF'}
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                      </View>
                                      <Slider
                                        style={styles.slider}
                                        minimumValue={min}
                                        maximumValue={max}
                                        value={brightness}
                                        step={1}
                                        onValueChange={(v) => handleSlider(equipment, actWithCtrl, v)}
                                        minimumTrackTintColor={iconColor || '#8B5CF6'}
                                        maximumTrackTintColor="#E5E7EB"
                                        thumbTintColor={iconColor || '#8B5CF6'}
                                        disabled={!connected}
                                      />
                                    </View>
                                  );
                                }

                                // ── Toggle ──
                                if (ctrlType === 'toggle') {
                                  const on = getToggle(equipment.mac, actuator.type);
                                  return (
                                    <View key={`${sensorType}__${actuator.type}`} style={styles.actuatorRow}>
                                      <View style={styles.actuatorRowLeft}>
                                        {IconComp && <IconComp size={16} color={iconColor} strokeWidth={2} />}
                                        <Text style={styles.actuatorLabel}>{displayLabel}</Text>
                                      </View>
                                      <TouchableOpacity
                                        onPress={() => handleToggle(equipment, actWithCtrl)}
                                        style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                                        activeOpacity={0.8}
                                        disabled={!connected}
                                      >
                                        <Text style={[styles.toggleBtnText, on && styles.toggleBtnTextOn]}>
                                          {on ? 'ON' : 'OFF'}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  );
                                }

                                // ── Generic slider ──
                                if (ctrlType === 'slider') {
                                  const min = actuator.min ?? meta?.min ?? 0;
                                  const max = actuator.max ?? meta?.max ?? 255;
                                  const val = getSlider(equipment.mac, actuator.type, meta?.default ?? 0);
                                  return (
                                    <View key={`${sensorType}__${actuator.type}`} style={styles.actuatorSliderBlock}>
                                      <View style={styles.sliderLabel}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                          {IconComp && <IconComp size={14} color={iconColor} strokeWidth={2} />}
                                          <Text style={styles.actuatorLabel}>{displayLabel}</Text>
                                        </View>
                                        <Text style={[styles.sliderValue, { color: iconColor || '#8B5CF6' }]}>{val}</Text>
                                      </View>
                                      <Slider
                                        style={styles.slider}
                                        minimumValue={min}
                                        maximumValue={max}
                                        value={val}
                                        step={1}
                                        onValueChange={(v) => handleSlider(equipment, actWithCtrl, v)}
                                        minimumTrackTintColor={iconColor || '#8B5CF6'}
                                        maximumTrackTintColor="#E5E7EB"
                                        thumbTintColor={iconColor || '#8B5CF6'}
                                        disabled={!connected}
                                      />
                                    </View>
                                  );
                                }

                                // ── Tone — interactive toggle (not just a badge) ──
                                if (ctrlType === 'tone') {
                                  const on = getToggle(equipment.mac, actuator.type);
                                  return (
                                    <View key={`${sensorType}__${actuator.type}`} style={styles.actuatorRow}>
                                      <View style={styles.actuatorRowLeft}>
                                        {IconComp && <IconComp size={16} color={iconColor} strokeWidth={2} />}
                                        <Text style={styles.actuatorLabel}>{displayLabel}</Text>
                                        <Text style={styles.toneBadgeInline}>♪ {actuator.frequency ?? meta?.frequency ?? 1000} Hz</Text>
                                      </View>
                                      <TouchableOpacity
                                        onPress={() => handleToggle(equipment, actWithCtrl)}
                                        style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                                        activeOpacity={0.8}
                                        disabled={!connected}
                                      >
                                        <Text style={[styles.toggleBtnText, on && styles.toggleBtnTextOn]}>
                                          {on ? 'ON' : 'OFF'}
                                        </Text>
                                      </TouchableOpacity>
                                    </View>
                                  );
                                }

                                return null;
                              })}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      /* ── Sensor Sliders fallback when no actuators configured ── */
                      hasSensors ? (
                        equipment.sensors.map((sensorType) => {
                          const cfg        = SENSOR_CONFIG[sensorType];
                          if (!cfg) return null;
                          const sensorMeta = SENSOR_TYPES.find((s) => s.value === sensorType);
                          const val        = getSensorSliderValue(eqId, sensorType);
                          const { Icon: SensorIcon, color: sensorColor } = sensorMeta || {};

                          return (
                            <View key={sensorType} style={styles.sliderControl}>
                              <View style={styles.sliderLabel}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                  {SensorIcon && <SensorIcon size={14} color={sensorColor} strokeWidth={2} />}
                                  <Text style={styles.labelText}>{cfg.label}</Text>
                                </View>
                                <Text style={[styles.sliderValue, { color: sensorColor }]}>
                                  {val}{cfg.unit}
                                </Text>
                              </View>
                              <Slider
                                style={styles.slider}
                                minimumValue={cfg.min}
                                maximumValue={cfg.max}
                                value={val}
                                step={1}
                                onValueChange={(v) => handleSensorSliderChange(eqId, sensorType, v)}
                                minimumTrackTintColor={sensorColor || '#8B5CF6'}
                                maximumTrackTintColor="#E5E7EB"
                                thumbTintColor={sensorColor || '#8B5CF6'}
                              />
                            </View>
                          );
                        })
                      ) : (
                        <Text style={styles.noSensorsText}>No actuators configured</Text>
                      )
                    )}

                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── Device Statistics ── */}
        {!loading && !error && (
          <View style={styles.statsCard}>
            <Text style={styles.statsCardTitle}>Device Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total</Text>
                <Text style={styles.statValue}>{equipmentList.length}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#065F46' }]}>Active</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {activeCount}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#991B1B' }]}>Inactive</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {inactiveCount}
                </Text>
              </View>
            </View>
          </View>
        )}

      </ScrollView>

      {/* ── Modal: Manage Nodes ── */}
      <Modal
        visible={showEquipmentList}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowEquipmentList(false)}
      >
        <EquipmentList
          onClose={() => setShowEquipmentList(false)}
          equipments={equipmentList}
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          onAddPress={() => setShowAddModal(true)}
        />

        <Modal
          visible={showAddModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowAddModal(false)}
        >
          <AddEquipment
            onClose={() => setShowAddModal(false)}
            onSuccess={handleAddSuccess}
          />
        </Modal>
      </Modal>

      {/* ── Modal: Manage Seuils ── */}
      <Modal
        visible={showSeuils}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowSeuils(false)}
      >
        <ManageSeuils
          onClose={() => setShowSeuils(false)}
          equipments={equipmentList}
        />
      </Modal>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent:          { paddingBottom: 40 },

  header:                 { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingHorizontal: 24, paddingTop: 24 },
  title:                  { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle:               { fontSize: 14, color: '#6B7280' },

  quickActions:           { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24, gap: 12 },
  quickActionCard:        { flex: 1, borderRadius: 16, overflow: 'hidden', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 12, elevation: 6 },
  quickActionGradient:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8 },
  quickActionText:        { fontSize: 14, fontWeight: '600', color: '#fff' },
  quickActionOutline:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#8B5CF6', borderRadius: 16, gap: 8 },
  quickActionTextOutline: { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },

  offlineBanner:          { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 24, marginBottom: 8, padding: 10, backgroundColor: '#451a03', borderRadius: 8, borderWidth: 1, borderColor: '#92400e' },
  offlineBannerText:      { fontSize: 12, color: '#fbbf24', flex: 1 },
  syncBanner:             { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 8, padding: 10, backgroundColor: '#1e1b4b', borderRadius: 8, borderWidth: 1, borderColor: '#4338ca' },
  syncBannerText:         { fontSize: 12, color: '#818CF8', flex: 1 },
  syncingLabel:           { fontSize: 11, color: '#818CF8', marginLeft: 8, fontStyle: 'italic' },

  stateBox:               { alignItems: 'center', paddingVertical: 40, marginHorizontal: 24, borderRadius: 16, backgroundColor: '#fff', gap: 12 },
  stateText:              { fontSize: 14, color: '#6B7280' },

  controlGrid:            { paddingHorizontal: 24, gap: 0 },
  emptyState:             { alignItems: 'center', paddingVertical: 60, backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyIcon:              { width: 80, height: 80, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:             { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyText:              { fontSize: 14, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },

  controlCard:            { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  controlHeader:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  controlTitle:           { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  controlIconBox:         { width: 48, height: 48, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deviceName:             { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  deviceNodeId:           { fontSize: 12, color: '#6B7280', fontFamily: 'Courier New' },

  statusRow:              { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  led:                    { width: 10, height: 10, borderRadius: 5 },
  ledOn:                  { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.5, shadowRadius: 4 },
  ledOff:                 { backgroundColor: '#D1D5DB' },
  statusText:             { fontSize: 13, fontWeight: '500' },

  // Sensor sliders fallback
  sliderControl:          { marginBottom: 14 },
  sliderLabel:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  labelText:              { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sliderValue:            { fontSize: 13, fontWeight: '700' },
  slider:                 { width: '100%', height: 36 },
  noSensorsText:          { fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },

  // Actuator styles
  actuatorSection:        { marginTop: 4, gap: 14 },
  actuatorGroup:          { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  actuatorGroupHeader:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  actuatorGroupLabel:     { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.7, textTransform: 'uppercase' },
  actuatorRow:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  actuatorRowLeft:        { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actuatorLabel:          { fontSize: 13, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  toggleBtn:              { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'transparent' },
  toggleBtnOn:            { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  toggleBtnText:          { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  toggleBtnTextOn:        { color: '#fff' },
  actuatorSliderBlock:    { backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  toneBadgeInline:        { fontSize: 11, color: '#F59E0B', marginLeft: 4 },

  // Stats card
  statsCard:              { marginHorizontal: 24, marginTop: 8, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  statsCardTitle:         { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  statsRow:               { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  statItem:               { flex: 1, alignItems: 'center', minWidth: 60 },
  statLabel:              { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 6 },
  statValue:              { fontSize: 22, fontWeight: '700', color: '#111827' },
  statDivider:            { width: 1, height: 40, backgroundColor: '#F3F4F6' },
});

export default ControlPage;
