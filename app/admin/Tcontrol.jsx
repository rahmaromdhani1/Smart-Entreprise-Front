import React, { useState, useEffect } from 'react';
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
  Settings, SlidersHorizontal, Server,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Lock, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity,
} from 'lucide-react-native';

import AddEquipment   from './AddEquipment';
import EquipmentList  from './equipementList';
import ManageSeuils   from './manageSeuil';
import { getEquipments, updateEquipment, deleteEquipment } from '../../Service/EquipmentApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const SENSOR_CONFIG = {
  temperature: { min: -50,   max: 150,    unit: '°C',  label: 'Temperature' },
  light:       { min: 0,     max: 200000, unit: 'lux', label: 'Light'       },
  humidity:    { min: 0,     max: 100,    unit: '%',   label: 'Humidity'    },
  pressure:    { min: 300,   max: 1100,   unit: 'hPa', label: 'Pressure'    },
  co2:         { min: 0,     max: 50000,  unit: 'ppm', label: 'CO₂'         },
  motion:      { min: 0,     max: 1,      unit: '0/1', label: 'Motion'      },
};

const NODE_ICONS = [
  { value: 'lighting', Icon: Lightbulb, color: '#F59E0B' },
  { value: 'hvac',     Icon: Wind,      color: '#0EA5E9' },
  { value: 'cameras',  Icon: Video,     color: '#6366F1' },
  { value: 'access',   Icon: Lock,      color: '#10B981' },
  { value: 'fire',     Icon: Flame,     color: '#EF4444' },
  { value: 'water',    Icon: Droplet,   color: '#3B82F6' },
];

const SENSOR_TYPES = [
  { value: 'temperature', Icon: Thermometer, color: '#EF4444' },
  { value: 'light',       Icon: Sun,         color: '#F59E0B' },
  { value: 'humidity',    Icon: Droplets,    color: '#3B82F6' },
  { value: 'pressure',    Icon: Gauge,       color: '#8B5CF6' },
  { value: 'co2',         Icon: Wind,        color: '#06B6D4' },
  { value: 'motion',      Icon: Activity,    color: '#6366F1' },
];

/** Render the correct icon for a given equipment icon key */
const NodeIcon = ({ iconKey, size = 24 }) => {
  const found = NODE_ICONS.find((n) => n.value === iconKey);
  if (!found) return <Server size={size} color="#8B5CF6" />;
  const { Icon, color } = found;
  return <Icon size={size} color={color} strokeWidth={2} />;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ControlPage = () => {
  // ── State ─────────────────────────────────────────────────────────────────
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);

  // Local slider values — keyed by `${equipmentId}_${sensorType}`
  const [sliderValues, setSliderValues]   = useState({});

  // Modal visibility
  const [showEquipmentList, setShowEquipmentList] = useState(false);
  const [showAddModal,      setShowAddModal]       = useState(false);
  const [showSeuils,        setShowSeuils]         = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getEquipmentId = (eq) => eq?._id || eq?.id || '';

  const getInitialSliderValue = (sensorType) => {
    const cfg = SENSOR_CONFIG[sensorType];
    if (!cfg) return 0;
    return Math.round((cfg.min + cfg.max) / 2);
  };

  const getSliderValue = (eqId, sensorType) => {
    const key = `${eqId}_${sensorType}`;
    return sliderValues[key] ?? getInitialSliderValue(sensorType);
  };

  const handleSliderChange = (eqId, sensorType, value) => {
    setSliderValues((prev) => ({
      ...prev,
      [`${eqId}_${sensorType}`]: Math.round(value),
    }));
  };

  // ── Fetch equipments on mount ─────────────────────────────────────────────
  useEffect(() => {
    const fetchEquipments = async () => {
      try {
        setLoading(true);
        setError(null);
        const res  = await getEquipments();
        const list = res?.data || res;
        setEquipmentList(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('[ControlPage] fetchEquipments error:', err);
        setError('Failed to load equipments.');
      } finally {
        setLoading(false);
      }
    };

    fetchEquipments();
  }, []);

  // ── CRUD handlers propagated from EquipmentList / AddEquipment ───────────

  /** Called when AddEquipment succeeds */
  const handleAddSuccess = (newEquipment) => {
    setEquipmentList((prev) => [...prev, newEquipment]);
    setShowAddModal(false);
  };

  /** Called when EquipmentList deletes a device */
  const handleDelete = async (id) => {
    try {
      await deleteEquipment(id);
      setEquipmentList((prev) => prev.filter((e) => getEquipmentId(e) !== id));
    } catch (err) {
      console.error('[ControlPage] deleteEquipment error:', err);
    }
  };

  /** Called when EquipmentList saves an edit */
  const handleUpdate = async (id, updatedData) => {
    try {
      const response = await updateEquipment(id, updatedData);
      const updated  = response?.data?.equipment || response?.data || updatedData;
      setEquipmentList((prev) =>
        prev.map((e) => (getEquipmentId(e) === id ? { ...e, ...updated } : e))
      );
    } catch (err) {
      console.error('[ControlPage] updateEquipment error:', err);
      // Optimistic update even on API failure
      setEquipmentList((prev) =>
        prev.map((e) => (getEquipmentId(e) === id ? { ...e, ...updatedData } : e))
      );
    }
  };

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

          {/* Manage Seuils */}
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

          {/* Manage Nodes */}
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

        {/* ── Control Grid (dynamic) ── */}
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
                const eqId     = getEquipmentId(equipment);
                const isOnline = equipment.status === 'online';
                const hasSensors = Array.isArray(equipment.sensors) && equipment.sensors.length > 0;

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
                    </View>

                    {/* Sensor Sliders */}
                    {hasSensors && equipment.sensors.map((sensorType) => {
                      const cfg        = SENSOR_CONFIG[sensorType];
                      if (!cfg) return null;
                      const sensorMeta = SENSOR_TYPES.find((s) => s.value === sensorType);
                      const val        = getSliderValue(eqId, sensorType);
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
                            onValueChange={(v) => handleSliderChange(eqId, sensorType, v)}
                            minimumTrackTintColor={sensorColor || '#8B5CF6'}
                            maximumTrackTintColor="#E5E7EB"
                            thumbTintColor={sensorColor || '#8B5CF6'}
                          />
                        </View>
                      );
                    })}

                    {/* No sensors fallback */}
                    {!hasSensors && (
                      <Text style={styles.noSensorsText}>No sensors attached</Text>
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
                <Text style={styles.statLabel}>Total Devices</Text>
                <Text style={styles.statValue}>{equipmentList.length}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#065F46' }]}>Active</Text>
                <Text style={[styles.statValue, { color: '#10B981' }]}>
                  {equipmentList.filter((e) => e.status === 'online').length}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: '#991B1B' }]}>Inactive</Text>
                <Text style={[styles.statValue, { color: '#EF4444' }]}>
                  {equipmentList.filter((e) => e.status !== 'online').length}
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

        {/* Nested Add Modal */}
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

  sliderControl:          { marginBottom: 14 },
  sliderLabel:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  labelText:              { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  sliderValue:            { fontSize: 13, fontWeight: '700' },
  slider:                 { width: '100%', height: 36 },
  noSensorsText:          { fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },

  // Stats card
  statsCard:              { marginHorizontal: 24, marginTop: 8, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  statsCardTitle:         { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  statsRow:               { flexDirection: 'row', alignItems: 'center' },
  statItem:               { flex: 1, alignItems: 'center' },
  statLabel:              { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 6 },
  statValue:              { fontSize: 26, fontWeight: '700', color: '#111827' },
  statDivider:            { width: 1, height: 40, backgroundColor: '#F3F4F6' },
});

export default ControlPage;