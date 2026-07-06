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
  ArrowLeft, Globe, MapPin, Edit2, Trash2, Plus, Server, FileText, Lock,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity, PlugZap,
} from 'lucide-react-native';

// ─── Constants ────────────────────────────────────────────────────────────────

const NODE_ICONS = [
  { value: 'lighting', label: 'Lighting', Icon: Lightbulb, color: '#F59E0B' },
  { value: 'hvac',     label: 'HVAC',     Icon: Wind,      color: '#0EA5E9' },
  { value: 'cameras',  label: 'Cameras',  Icon: Video,     color: '#6366F1' },
  { value: 'access',   label: 'Access',   Icon: Lock,      color: '#10B981' },
  { value: 'fire',     label: 'Fire',     Icon: Flame,     color: '#EF4444' },
  { value: 'water',    label: 'Water',    Icon: Droplet,   color: '#3B82F6' },
  { value: 'energy',   label: 'Energy',   Icon: PlugZap,   color: '#F59E0B' },
];

const SENSOR_TYPES = [
  { value: 'temperature', label: 'Temperature', Icon: Thermometer, color: '#EF4444' },
  { value: 'light',       label: 'Light',       Icon: Sun,         color: '#F59E0B' },
  { value: 'humidity',    label: 'Humidity',    Icon: Droplets,    color: '#3B82F6' },
  { value: 'pressure',    label: 'Pressure',    Icon: Gauge,       color: '#8B5CF6' },
  { value: 'co2',         label: 'CO₂',         Icon: Wind,        color: '#06B6D4' },
  { value: 'motion',      label: 'Motion',      Icon: Activity,    color: '#6366F1' },
  { value: 'energy',      label: 'Energy',      Icon: PlugZap,     color: '#F59E0B' },
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
 *   equipments           Equipment[]
 *   onDelete             (id) => void
 *   onUpdate             (id, data) => void
 *   onAddPress           () => void
 */
const EquipmentList = ({ onClose, equipments: externalEquipments, onDelete, onUpdate, onAddPress }) => {
  const insets = useSafeAreaInsets();

  const [localEquipments, setLocalEquipments] = useState([
    { id: '1', name: 'Main Server',   nodeId: 'NODE001', ipAddress: '168.1.100',     floor: 'Floor 1', officeRoom: 'Room A', description: '', status: 'online',  icon: 'lighting', sensors: ['temperature', 'humidity'], mac: '' },
    { id: '2', name: 'Backup Server', nodeId: 'NODE002', ipAddress: '192.168.1.101', floor: 'Floor 1', officeRoom: 'Room A', description: '', status: 'online',  icon: 'hvac',     sensors: ['temperature'],              mac: '' },
    { id: '3', name: 'Router Main',   nodeId: 'RTR001',  ipAddress: '192.168.1.1',   floor: 'Floor 3', officeRoom: '',       description: '', status: 'offline', icon: 'cameras',  sensors: ['motion'],                   mac: '' },
  ]);

  const equipments = externalEquipments ?? localEquipments;

  // Edit modal state
  const [isModalVisible,    setIsModalVisible]   = useState(false);
  const [editingEquipment,  setEditingEquipment] = useState(null);
  const [formData,          setFormData]         = useState({
    name: '', nodeId: '', ipAddress: '', floor: '', officeRoom: '', description: '',
    status: 'online', icon: 'lighting', sensors: [], mac: '',
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
      name:        equipment.name        || '',
      nodeId:      equipment.nodeId      || '',
      ipAddress:   equipment.ipAddress   || '',
      floor:       equipment.floor       || '',
      officeRoom:  equipment.officeRoom  || '',
      description: equipment.description || '',
      status:      equipment.status      || 'online',
      icon:        equipment.icon        || 'lighting',
      sensors:     equipment.sensors     || [],
      // ── ADDED: preserve MAC (mirrors web — read-only in edit) ──
      mac:         equipment.mac         || '',
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
    const id      = editingEquipment._id || editingEquipment.id;
    // ── ADDED: include mac in updated payload (read-only, just preserved) ──
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
            const itemId      = item._id || item.id;
            const locationStr = [item.floor, item.officeRoom].filter(Boolean).join(' — ') || '—';

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
                    <Text style={styles.detailValue}>{locationStr}</Text>
                  </View>

                  {/* ── ADDED: MAC address display (mirrors web eq-detail-row) ── */}
                  {!!item.mac && (
                    <View style={styles.detailRow}>
                      <Lock size={15} color="#8B5CF6" />
                      <Text style={styles.detailLabel}>MAC: </Text>
                      <Text style={[styles.detailValue, { color: '#8B5CF6' }]}>{item.mac}</Text>
                    </View>
                  )}

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

                  {item.lastSeen && (
                    <Text style={styles.lastSeen}>Last seen: {item.lastSeen}</Text>
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

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>

              {/* Name */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalLabel}>Name *</Text>
                <TextInput
                  placeholder="Name"
                  placeholderTextColor="#9CA3AF"
                  style={styles.modalInput}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />
              </View>

              {/* Node ID */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalLabel}>Node ID *</Text>
                <TextInput
                  placeholder="Node ID"
                  placeholderTextColor="#9CA3AF"
                  style={styles.modalInput}
                  value={formData.nodeId}
                  onChangeText={(text) => setFormData({ ...formData, nodeId: text })}
                  autoCapitalize="characters"
                />
              </View>

              {/* IP Address */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalLabel}>IP Address *</Text>
                <TextInput
                  placeholder="IP Address"
                  placeholderTextColor="#9CA3AF"
                  style={styles.modalInput}
                  value={formData.ipAddress}
                  onChangeText={(text) => setFormData({ ...formData, ipAddress: text })}
                />
              </View>

              {/* Floor + Office Room */}
              <View style={styles.gridRow}>
                <View style={{ flex: 1, marginBottom: 12 }}>
                  <Text style={styles.modalLabel}>Floor</Text>
                  <TextInput
                    placeholder="Floor"
                    placeholderTextColor="#9CA3AF"
                    style={styles.modalInput}
                    value={formData.floor}
                    onChangeText={(text) => setFormData({ ...formData, floor: text })}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1, marginBottom: 12 }}>
                  <Text style={styles.modalLabel}>Office Room</Text>
                  <TextInput
                    placeholder="Room"
                    placeholderTextColor="#9CA3AF"
                    style={styles.modalInput}
                    value={formData.officeRoom}
                    onChangeText={(text) => setFormData({ ...formData, officeRoom: text })}
                  />
                </View>
              </View>

              {/* Description */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalLabel}>Description</Text>
                <View style={styles.textareaWrapper}>
                  <FileText size={16} color="#8B5CF6" style={{ marginTop: 2, marginRight: 8 }} />
                  <TextInput
                    placeholder="Additional notes..."
                    placeholderTextColor="#9CA3AF"
                    style={[styles.modalInput, styles.modalTextarea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* ── ADDED: MAC Address — read-only in edit (mirrors web) ── */}
              <View style={{ marginBottom: 12 }}>
                <Text style={styles.modalLabel}>Device MAC Address</Text>
                {formData.mac ? (
                  <>
                    <View style={[styles.macInputWrapper]}>
                      <Lock size={16} color="#8B5CF6" style={{ marginRight: 8 }} />
                      <Text style={styles.macReadOnlyText}>{formData.mac}</Text>
                    </View>
                    <Text style={styles.helperText}>🔒 Hardware identity — cannot be modified</Text>
                  </>
                ) : (
                  <Text style={[styles.helperText, { fontStyle: 'italic', color: '#9CA3AF' }]}>
                    No device assigned
                  </Text>
                )}
              </View>

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
                <Text style={styles.saveText}>💾 Save Changes</Text>
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
  lastSeen:           { fontSize: 12, color: '#9CA3AF', marginTop: 2 },

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

  gridRow:            { flexDirection: 'row' },
  // Modal
  modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalContent:       { backgroundColor: '#fff', borderRadius: 20, padding: 24, maxHeight: '92%' },
  modalTitle:         { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 20 },
  modalLabel:         { fontSize: 13, fontWeight: '600', color: '#111827', marginBottom: 6 },
  modalInput:         { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', backgroundColor: '#F9FAFB' },
  textareaWrapper:    { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#F9FAFB' },
  modalTextarea:      { flex: 1, minHeight: 70, borderWidth: 0, padding: 0, backgroundColor: 'transparent' },
  helperText:         { fontSize: 12, color: '#6B7280', marginTop: 4 },
  // ── ADDED: MAC read-only row in edit modal ──
  macInputWrapper:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, backgroundColor: '#F3F4F6', opacity: 0.85 },
  macReadOnlyText:    { fontSize: 14, fontWeight: '600', color: '#6B7280', fontFamily: 'Courier New', letterSpacing: 0.5 },
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