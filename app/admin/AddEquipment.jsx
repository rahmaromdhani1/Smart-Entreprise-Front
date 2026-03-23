import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X, Server, Hash, Globe, MapPin, FileText,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Lock, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity,
} from 'lucide-react-native';
import { createEquipment } from '../../Service/EquipmentApi';

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

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * AddEquipment
 * Props:
 *   onClose   () => void
 *   onSuccess (equipment) => void
 */
const AddEquipment = ({ onClose, onSuccess }) => {
  const [name, setName]               = useState('');
  const [nodeId, setNodeId]           = useState('');
  const [ipAddress, setIpAddress]     = useState('');
  const [location, setLocation]       = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon]               = useState('lighting');
  const [sensors, setSensors]         = useState([]);
  const [loading, setLoading]         = useState(false);
  const [errors, setErrors]           = useState({});

  // ── Toggle sensor ────────────────────────────────────────────────────────
  const toggleSensor = (value) => {
    setSensors((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value]
    );
  };

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!name.trim())      e.name      = 'Name is required';
    if (!nodeId.trim())    e.nodeId    = 'Node ID is required';
    if (!ipAddress.trim()) e.ipAddress = 'IP Address is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name:        name.trim(),
        nodeId:      nodeId.trim(),
        ipAddress:   ipAddress.trim(),
        location:    location.trim(),
        description: description.trim(),
        icon,
        sensors,
      };
      const response = await createEquipment(payload);
      const created  = response?.data?.equipment || response?.equipment || response;
      onSuccess?.(created);
    } catch (err) {
      Alert.alert('❌ Error', err.response?.data?.message || err.message || 'Failed to add equipment');
    } finally {
      setLoading(false);
    }
  };

  // ── Sub-components ───────────────────────────────────────────────────────

  const IconPicker = () => (
    <View style={styles.typeGrid}>
      {NODE_ICONS.map(({ value: val, label, Icon: Ico, color }) => {
        const active = icon === val;
        return (
          <TouchableOpacity
            key={val}
            style={[styles.typeCard, active && { borderColor: color, backgroundColor: `${color}18` }]}
            onPress={() => setIcon(val)}
            activeOpacity={0.7}
          >
            <View style={[styles.typeIconBox, { backgroundColor: `${color}18` }]}>
              <Ico size={20} color={color} strokeWidth={2} />
            </View>
            <Text style={[styles.typeLabel, active && { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const SensorPicker = () => (
    <>
      <View style={styles.typeGrid}>
        {SENSOR_TYPES.map(({ value: val, label, Icon: Ico, color }) => {
          const active = sensors.includes(val);
          return (
            <TouchableOpacity
              key={val}
              style={[styles.typeCard, active && { borderColor: color, backgroundColor: `${color}18` }]}
              onPress={() => toggleSensor(val)}
              activeOpacity={0.7}
            >
              <View style={[styles.typeIconBox, { backgroundColor: `${color}18` }]}>
                <Ico size={20} color={color} strokeWidth={2} />
              </View>
              <Text style={[styles.typeLabel, active && { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {sensors.length > 0 && (
        <Text style={styles.helperText}>
          Selected: <Text style={{ fontWeight: '700', color: '#111827' }}>{sensors.join(', ')}</Text>
        </Text>
      )}
    </>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Server size={24} color="#fff" />
            <Text style={styles.headerTitle}>Add Equipment</Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <X size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.formCard}>

          {/* ── Section: Equipment Information ── */}
          <Text style={styles.sectionTitle}>Equipment Information</Text>

          {/* Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Equipment Name *</Text>
            <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
              <Server size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Main Server, Router 1"
                placeholderTextColor="#9CA3AF"
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: null })); }}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Node ID */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Node ID *</Text>
            <View style={[styles.inputWrapper, errors.nodeId && styles.inputError]}>
              <Hash size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., NODE001, SRV-001"
                placeholderTextColor="#9CA3AF"
                value={nodeId}
                onChangeText={(t) => { setNodeId(t); setErrors((e) => ({ ...e, nodeId: null })); }}
                autoCapitalize="characters"
              />
            </View>
            {errors.nodeId && <Text style={styles.errorText}>{errors.nodeId}</Text>}
          </View>

          {/* IP Address */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>IP Address *</Text>
            <View style={[styles.inputWrapper, errors.ipAddress && styles.inputError]}>
              <Globe size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., 192.168.1.100"
                placeholderTextColor="#9CA3AF"
                value={ipAddress}
                onChangeText={(t) => { setIpAddress(t); setErrors((e) => ({ ...e, ipAddress: null })); }}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.ipAddress && <Text style={styles.errorText}>{errors.ipAddress}</Text>}
            <Text style={styles.helperText}>Format: xxx.xxx.xxx.xxx (0-255)</Text>
          </View>

          {/* Location */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputWrapper}>
              <MapPin size={18} color="#8B5CF6" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g., Server Room A, Floor 3"
                placeholderTextColor="#9CA3AF"
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <View style={[styles.inputWrapper, { alignItems: 'flex-start', paddingTop: 12 }]}>
              <FileText size={18} color="#8B5CF6" style={[styles.inputIcon, { marginTop: 2 }]} />
              <TextInput
                style={[styles.input, { minHeight: 70 }]}
                placeholder="Additional notes..."
                placeholderTextColor="#9CA3AF"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* ── Section: Node Icon ── */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Node Icon</Text>
          <Text style={styles.label}>Select Icon *</Text>
          <IconPicker />

          {/* ── Section: Attached Sensors ── */}
          <View style={styles.divider} />
          <Text style={styles.sectionTitle}>Attached Sensors</Text>
          <Text style={styles.label}>Select Sensors (multiple allowed)</Text>
          <SensorPicker />

          {/* Notice */}
          <View style={styles.notice}>
            <Text style={styles.noticeText}>⚠️ Fields marked with * are required.</Text>
          </View>

          {/* Actions */}
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onClose}
              activeOpacity={0.7}
              disabled={loading}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSubmitWrapper}
              onPress={handleSubmit}
              activeOpacity={0.85}
              disabled={loading}
            >
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btnSubmit}
              >
                {loading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.btnSubmitText}>Add </Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#F9FAFB' },
  header:            { paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
  headerContent:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerLeft:        { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle:       { fontSize: 20, fontWeight: '700', color: '#fff' },
  formContainer:     { padding: 20 },
  formCard:          { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  sectionTitle:      { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16 },
  divider:           { height: 1, backgroundColor: '#F3F4F6', marginVertical: 5 },
  formGroup:         { marginBottom: 16 },
  label:             { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  inputWrapper:      { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#F9FAFB' },
  inputError:        { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon:         { marginRight: 10 },
  input:             { flex: 1, fontSize: 14, color: '#111827', padding: 0 },
  errorText:         { fontSize: 12, color: '#EF4444', marginTop: 4, marginLeft: 4 },
  helperText:        { fontSize: 12, color: '#6B7280', marginTop: 5 },

  // Type grid (shared between IconPicker and SensorPicker)
  typeGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  typeCard:          { width: '30%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent', gap: 6 },
  typeIconBox:       { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel:         { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  notice:            { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 8, marginVertical: 16 },
  noticeText:        { fontSize: 12, color: '#92400E', fontWeight: '500' },
  formActions:       { flexDirection: 'row', gap: 12 },
  btnCancel:         { flex: 1, padding: 14, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center',marginVertical: 16 },
  btnCancelText:     { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  btnSubmitWrapper:  { flex: 1, borderRadius: 12, marginVertical: 16 ,overflow: 'hidden', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 },
  btnSubmit:         { padding: 14, alignItems: 'center', justifyContent: 'center' },
  btnSubmitText:     { fontSize: 15, fontWeight: '600', color: '#fff'},
});

export default AddEquipment;