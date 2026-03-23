import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, Globe, MapPin, Edit2, Trash2, Plus, Server,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Lock, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity,
} from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_ICONS = [
  { value: 'lighting', label: 'Lighting', Icon: Lightbulb, color: '#F59E0B' },
  { value: 'hvac',     label: 'HVAC',     Icon: Wind,      color: '#0EA5E9' },
  { value: 'cameras',  label: 'Cameras',  Icon: Video,     color: '#6366F1' },
  { value: 'access',   label: 'Access',   Icon: Lock,      color: '#10B981' },
  { value: 'fire',     label: 'Fire',     Icon: Flame,     color: '#EF4444' },
  { value: 'water',    label: 'Water',    Icon: Droplet,   color: '#3B82F6' },
];

const SENSOR_TYPES = [
  { value: 'temperature', label: 'Temperature', Icon: Thermometer, color: '#EF4444' },
  { value: 'light',       label: 'Light',       Icon: Sun,         color: '#F59E0B' },
  { value: 'humidity',    label: 'Humidity',    Icon: Droplets,    color: '#3B82F6' },
  { value: 'pressure',    label: 'Pressure',    Icon: Gauge,       color: '#8B5CF6' },
  { value: 'co2',         label: 'CO₂',         Icon: Wind,        color: '#06B6D4' },
  { value: 'motion',      label: 'Motion',      Icon: Activity,    color: '#6366F1' },
];

/** Render the correct icon for a given icon key */
const NodeIcon = ({ iconKey, size = 24 }) => {
  const found = NODE_ICONS.find((n) => n.value === iconKey);
  if (!found) return <Server size={size} color="#8B5CF6" />;
  const { Icon, color } = found;
  return <Icon size={size} color={color} strokeWidth={2} />;
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * EquipmentList
 * Props:
 *   onClose              () => void
 *   equipments           Equipment[]  (passed from parent)
 *   onDelete             (id) => void
 *   onUpdate             (id, data) => void   ← NEW: propagates edits to parent
 *   onAddPress           () => void
 */
const EquipmentList = ({ onClose, equipments: externalEquipments, onDelete, onUpdate, onAddPress }) => {
  const insets = useSafeAreaInsets();

  // Fallback local list (used only if no external equipments provided)
  const [localEquipments, setLocalEquipments] = useState([
    { id: '1', name: 'Main Server',   nodeId: 'NODE001', ipAddress: '192.168.1.100', location: 'Server Room A', status: 'online',  icon: 'lighting', sensors: ['temperature', 'humidity'] },
    { id: '2', name: 'Backup Server', nodeId: 'NODE002', ipAddress: '192.168.1.101', location: 'Server Room A', status: 'online',  icon: 'hvac',     sensors: ['temperature'] },
    { id: '3', name: 'Router Main',   nodeId: 'RTR001',  ipAddress: '192.168.1.1',   location: 'Floor 3',       status: 'offline', icon: 'cameras',  sensors: ['motion'] },
  ]);

  const equipments = externalEquipments ?? localEquipments;

  // Edit modal state
  const [isModalVisible, setIsModalVisible]   = useState(false);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [formData, setFormData]               = useState({
    name: '', nodeId: '', ipAddress: '', location: '',
    status: 'online', icon: 'lighting', sensors: [],
  });

  // ── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = (id) => {
    Alert.alert('Delete Equipment', 'Are you sure you want to remove this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          if (onDelete) {
            onDelete(id);
          } else {
            setLocalEquipments((prev) => prev.filter((e) => e.id !== id));
          }
        },
      },
    ]);
  };

  // ── Open edit modal ──────────────────────────────────────────────────────
  const handleEdit = (equipment) => {
    setEditingEquipment(equipment);
    setFormData({
      name:      equipment.name        || '',
      nodeId:    equipment.nodeId      || '',
      ipAddress: equipment.ipAddress   || '',
      location:  equipment.location    || '',
      status:    equipment.status      || 'online',
      icon:      equipment.icon        || 'lighting',
      sensors:   equipment.sensors     || [],
    });
    setIsModalVisible(true);
  };

  // ── Toggle sensor in edit modal ──────────────────────────────────────────
  const toggleEditSensor = (value) => {
    setFormData((prev) => ({
      ...prev,
      sensors: prev.sensors.includes(value)
        ? prev.sensors.filter((s) => s !== value)
        : [...prev.sensors, value],
    }));
  };

  // ── Save edit ────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!formData.name.trim() || !formData.nodeId.trim()) {
      Alert.alert('Error', 'Name and Node ID are required');
      return;
    }
    const id = editingEquipment._id || editingEquipment.id;
    const updated = { ...editingEquipment, ...formData };

    if (onUpdate) {
      onUpdate(id, updated);
    } else {
      setLocalEquipments((prev) =>
        prev.map((e) => (e.id === id || e._id === id ? updated : e))
      );
    }
    setIsModalVisible(false);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: 20 + insets.top }]}
      >
        <TouchableOpacity onPress={onClose} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Equipment Management</Text>
          <Text style={styles.headerSubtitle}>
            {equipments.length} device{equipments.length !== 1 ? 's' : ''} registered
          </Text>
        </View>
      </LinearGradient>

      {/* ── Stats Row ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total</Text>
          <Text style={styles.statValue}>{equipments.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: '#065F46' }]}>Online</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {equipments.filter((e) => e.status === 'online').length}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statLabel, { color: '#991B1B' }]}>Offline</Text>
          <Text style={[styles.statValue, { color: '#EF4444' }]}>
            {equipments.filter((e) => e.status !== 'online').length}
          </Text>
        </View>
      </View>

      {/* ── Equipment List ── */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {equipments.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Server size={40} color="#8B5CF6" />
            </View>
            <Text style={styles.emptyTitle}>No Equipment Found</Text>
            <Text style={styles.emptyText}>Tap the + button to register your first device.</Text>
          </View>
        ) : (
          equipments.map((item) => {
            const itemId = item._id || item.id;
            return (
              <View key={itemId} style={styles.card}>

                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardInfo}>
                    <View style={styles.cardIconBox}>
                      <NodeIcon iconKey={item.icon} size={24} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName}>{item.name}</Text>
                      <Text style={styles.cardNodeId}>ID: {item.nodeId}</Text>
                    </View>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'online' ? styles.statusOnline : styles.statusOffline,
                  ]}>
                    <View style={[
                      styles.statusDot,
                      item.status === 'online' ? styles.dotOnline : styles.dotOffline,
                    ]} />
                    <Text style={[
                      styles.statusText,
                      item.status === 'online' ? styles.statusTextOnline : styles.statusTextOffline,
                    ]}>
                      {item.status === 'online' ? 'online' : 'offline'}
                    </Text>
                  </View>
                </View>

                {/* Card Details */}
                <View style={styles.cardDetails}>
                  <View style={styles.detailRow}>
                    <Globe size={15} color="#6B7280" />
                    <Text style={styles.detailLabel}>IP Address: </Text>
                    <Text style={styles.detailValue}>{item.ipAddress}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={15} color="#6B7280" />
                    <Text style={styles.detailLabel}>Location: </Text>
                    <Text style={styles.detailValue}>{item.location || '—'}</Text>
                  </View>

                  {/* Sensor Tags */}
                  {item.sensors && item.sensors.length > 0 && (
                    <View style={styles.sensorTagRow}>
                      {item.sensors.map((sType) => {
                        const match = SENSOR_TYPES.find((s) => s.value === sType);
                        if (!match) return null;
                        const { Icon: Ico, color, label } = match;
                        return (
                          <View key={`${itemId}-${sType}`} style={[styles.sensorTag, { borderColor: color }]}>
                            <Ico size={11} color={color} strokeWidth={2} />
                            <Text style={[styles.sensorTagText, { color }]}>{label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnEdit]}
                    onPress={() => handleEdit(item)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color="#8B5CF6" />
                    <Text style={styles.btnEditText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnDelete]}
                    onPress={() => handleDelete(itemId)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.btnDeleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        activeOpacity={0.9}
        onPress={onAddPress ?? onClose}
      >
        <LinearGradient
          colors={['#8B5CF6', '#EC4899']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Plus size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Edit Modal ── */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Equipment</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>

              {/* Basic fields */}
              {[
                { key: 'name',      placeholder: 'Name',       label: 'Name *'       },
                { key: 'nodeId',    placeholder: 'Node ID',    label: 'Node ID *'    },
                { key: 'ipAddress', placeholder: 'IP Address', label: 'IP Address *' },
                { key: 'location',  placeholder: 'Location',   label: 'Location'     },
              ].map(({ key, placeholder, label }) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <Text style={styles.modalLabel}>{label}</Text>
                  <TextInput
                    placeholder={placeholder}
                    placeholderTextColor="#9CA3AF"
                    style={styles.modalInput}
                    value={formData[key]}
                    onChangeText={(text) => setFormData({ ...formData, [key]: text })}
                    autoCapitalize={key === 'nodeId' ? 'characters' : 'none'}
                  />
                </View>
              ))}

              {/* Icon Picker */}
              <Text style={styles.modalLabel}>Node Icon</Text>
              <View style={styles.typeGrid}>
                {NODE_ICONS.map(({ value: val, label, Icon: Ico, color }) => {
                  const active = formData.icon === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.typeCard, active && { borderColor: color, backgroundColor: `${color}18` }]}
                      onPress={() => setFormData({ ...formData, icon: val })}
                      activeOpacity={0.7}
                    >
                      <Ico size={18} color={color} strokeWidth={2} />
                      <Text style={[styles.typeLabel, active && { color }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Sensor Picker */}
              <Text style={[styles.modalLabel, { marginTop: 12 }]}>Attached Sensors</Text>
              <View style={styles.typeGrid}>
                {SENSOR_TYPES.map(({ value: val, label, Icon: Ico, color }) => {
                  const active = formData.sensors.includes(val);
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[styles.typeCard, active && { borderColor: color, backgroundColor: `${color}18` }]}
                      onPress={() => toggleEditSensor(val)}
                      activeOpacity={0.7}
                    >
                      <Ico size={18} color={color} strokeWidth={2} />
                      <Text style={[styles.typeLabel, active && { color }]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {formData.sensors.length > 0 && (
                <Text style={[styles.helperText, { marginTop: 6 }]}>
                  Selected: <Text style={{ fontWeight: '700' }}>{formData.sensors.join(', ')}</Text>
                </Text>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveText}>💾 Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: '#F9FAFB' },
  header:             { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingBottom: 20 },
  backButton:         { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerText:         { flex: 1 },
  headerTitle:        { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSubtitle:     { fontSize: 14, color: 'rgba(255,255,255,0.9)' },

  statsRow:           { flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  statCard:           { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#F3F4F6', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  statLabel:          { fontSize: 12, color: '#6B7280', fontWeight: '500', marginBottom: 4 },
  statValue:          { fontSize: 22, fontWeight: '700', color: '#111827' },

  list:               { padding: 20 },
  card:               { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardInfo:           { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  cardIconBox:        { width: 48, height: 48, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName:           { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardNodeId:         { fontSize: 12, color: '#6B7280', fontFamily: 'Courier New' },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, gap: 5 },
  statusOnline:       { backgroundColor: '#D1FAE5' },
  statusOffline:      { backgroundColor: '#FEE2E2' },
  statusDot:          { width: 7, height: 7, borderRadius: 4 },
  dotOnline:          { backgroundColor: '#10B981' },
  dotOffline:         { backgroundColor: '#EF4444' },
  statusText:         { fontSize: 12, fontWeight: '600' },
  statusTextOnline:   { color: '#065F46' },
  statusTextOffline:  { color: '#991B1B' },
  cardDetails:        { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, gap: 7, marginBottom: 12 },
  detailRow:          { flexDirection: 'row', alignItems: 'center', gap: 7 },
  detailLabel:        { fontSize: 13, color: '#6B7280' },
  detailValue:        { fontSize: 13, fontWeight: '600', color: '#111827', fontFamily: 'Courier New' },

  sensorTagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  sensorTag:          { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.05)' },
  sensorTagText:      { fontSize: 11, fontWeight: '600' },

  cardActions:        { flexDirection: 'row', gap: 10 },
  btnAction:          { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  btnEdit:            { backgroundColor: '#F3F4F6' },
  btnEditText:        { fontSize: 14, fontWeight: '600', color: '#8B5CF6' },
  btnDelete:          { backgroundColor: '#FEE2E2' },
  btnDeleteText:      { fontSize: 14, fontWeight: '600', color: '#EF4444' },

  emptyState:         { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:          { width: 80, height: 80, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:         { fontSize: 18, fontWeight: '600', color: '#111827' },
  emptyText:          { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },

  fab:                { position: 'absolute', right: 14, zIndex: 1000, elevation: 10, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12 },
  fabGradient:        { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },

  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalContent:       { backgroundColor: '#fff', borderRadius: 20, padding: 24, maxHeight: '90%' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  modalLabel:         { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 },
  modalInput:         { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB' },
  helperText:         { fontSize: 12, color: '#6B7280' },
  typeGrid:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 4 },
  typeCard:           { width: '30%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent', gap: 4 },
  typeLabel:          { fontSize: 10, fontWeight: '600', color: '#6B7280', textAlign: 'center' },
  modalButtons:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 12 },
  cancelButton:       { flex: 1, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, alignItems: 'center' },
  cancelText:         { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  saveButton:         { flex: 1, backgroundColor: '#8B5CF6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveText:           { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default EquipmentList;