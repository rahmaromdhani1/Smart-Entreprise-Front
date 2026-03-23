import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft, RefreshCw, Save, ChevronDown, X,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Lock, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity,
} from 'lucide-react-native';
import {
  getSeuilProfileByEquipmentId,
  regenerateSeuilProfile,
  updateSeuilProfile,
} from '../../Service/SeuilApi';

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

const SENSOR_CONFIG = {
  temperature: { min: -50,   max: 150,    unit: '°C',  label: 'Temperature' },
  light:       { min: 0,     max: 200000, unit: 'lux', label: 'Light'       },
  humidity:    { min: 0,     max: 100,    unit: '%',   label: 'Humidity'    },
  pressure:    { min: 300,   max: 1100,   unit: 'hPa', label: 'Pressure'    },
  co2:         { min: 0,     max: 50000,  unit: 'ppm', label: 'CO₂'         },
  motion:      { min: 0,     max: 1,      unit: '0/1', label: 'Motion'      },
};


const buildDefaultThreshold = (sensorType) => {
  const cfg = SENSOR_CONFIG[sensorType];
  if (!cfg) return null;
  const mid = (cfg.min + cfg.max) / 2;
  return {
    min:        Number((mid - (cfg.max - cfg.min) * 0.1).toFixed(2)),
    max:        Number((mid + (cfg.max - cfg.min) * 0.1).toFixed(2)),
    threshold:  Number(mid.toFixed(2)),
    hysteresis: sensorType === 'temperature' ? 0.5 : sensorType === 'humidity' ? 2 : 50,
    confidence: 0.5,
    mode:       'ai',
    reason:     'Default threshold draft',
  };
};

const buildDraftFromEquipment = (equipment, existingThresholds = {}) => {
  const draft = {};
  (equipment?.sensors || []).forEach((s) => {
    draft[s] = existingThresholds[s] || buildDefaultThreshold(s);
  });
  return draft;
};

const withUserMode = (thresholds = {}) =>
  Object.fromEntries(
    Object.entries(thresholds).map(([k, v]) => [k, { ...v, mode: 'user' }])
  );

const validateDraft = (thresholds, sensorConfig) => {
  const errors = [];
  Object.entries(thresholds || {}).forEach(([sensorType, t]) => {
    const cfg = sensorConfig[sensorType];
    if (!cfg || !t) { errors.push(`${sensorType}: invalid config`); return; }
    const { min, max, threshold, hysteresis, confidence } = t;
    if ([min, max, threshold, hysteresis, confidence].some((n) => Number.isNaN(Number(n)))) {
      errors.push(`${sensorType}: all numeric fields must be valid`); return;
    }
    if (Number(min) > Number(max)) errors.push(`${sensorType}: min > max`);
    if (Number(threshold) < Number(min) || Number(threshold) > Number(max))
      errors.push(`${sensorType}: threshold must be between min and max`);
    if (Number(hysteresis) < 0) errors.push(`${sensorType}: hysteresis must be >= 0`);
    if (Number(confidence) < 0 || Number(confidence) > 1)
      errors.push(`${sensorType}: confidence must be 0–1`);
  });
  return errors;
};

// ─── Sub-component: ThresholdEditor ──────────────────────────────────────────

const ThresholdEditor = ({ sensorType, draft, isEquipmentMode, onChange }) => {
  const cfg        = SENSOR_CONFIG[sensorType];
  const sensorMeta = SENSOR_TYPES.find((s) => s.value === sensorType);
  if (!cfg || !draft) return null;

  const { Icon, color } = sensorMeta || {};

  const numericFields = [
    { key: 'min',        label: 'Min'        },
    { key: 'max',        label: 'Max'        },
    { key: 'threshold',  label: 'Threshold'  },
    { key: 'hysteresis', label: 'Hysteresis' },
    { key: 'confidence', label: 'Confidence (0–1)', step: '0.01' },
  ];

  return (
    <View style={styles.thresholdCard}>
      {/* Header */}
      <View style={styles.thresholdCardHeader}>
        {Icon && (
          <View style={[styles.thresholdIconBox, { backgroundColor: `${color}18` }]}>
            <Icon size={18} color={color} strokeWidth={2} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.thresholdTitle}>{cfg.label}</Text>
          <Text style={styles.thresholdHint}>{cfg.min} – {cfg.max} {cfg.unit}</Text>
        </View>
      </View>

      {/* Numeric fields (2 columns) */}
      <View style={styles.thresholdGrid}>
        {numericFields.map(({ key, label }) => (
          <View key={key} style={styles.thresholdFieldHalf}>
            <Text style={styles.thresholdLabel}>{label}</Text>
            <TextInput
              style={styles.thresholdInput}
              keyboardType="decimal-pad"
              value={String(draft[key] ?? '')}
              onChangeText={(v) => onChange(sensorType, key, v)}
            />
          </View>
        ))}

        {/* Mode (disabled in equipment mode → always "user") */}
        <View style={styles.thresholdFieldHalf}>
          <Text style={styles.thresholdLabel}>Mode</Text>
          {isEquipmentMode ? (
            <View style={[styles.thresholdInput, styles.thresholdInputDisabled]}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>user</Text>
            </View>
          ) : (
            <View style={[styles.thresholdInput, { padding: 0, overflow: 'hidden' }]}>
              {/* Simple mode display — in RN we can't use a native Select easily */}
              <Text style={{ padding: 12, fontSize: 14, color: '#111827' }}>
                {draft.mode || 'ai'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Reason */}
      <View style={{ marginTop: 8 }}>
        <Text style={styles.thresholdLabel}>Reason</Text>
        <TextInput
          style={[styles.thresholdInput, { height: 64, textAlignVertical: 'top', paddingTop: 10 }]}
          multiline
          value={draft.reason || ''}
          onChangeText={(v) => onChange(sensorType, 'reason', v)}
          placeholder="Explain this threshold..."
          placeholderTextColor="#9CA3AF"
        />
      </View>
    </View>
  );
};

const ManageSeuils = ({ onClose, equipments = [] }) => {
  const insets = useSafeAreaInsets();

  // Equipment selection
  const [selectedEquipment,   setSelectedEquipment]   = useState(null);
  const [showPickerModal,     setShowPickerModal]      = useState(false);

  // Equipment mode state
  const [seuilDraft,    setSeuilDraft]    = useState({});
  const [seuilProfile,  setSeuilProfile]  = useState(null);
  const [seuilMeta,     setSeuilMeta]     = useState(null);

  // Global mode state
  const [globalSensors, setGlobalSensors] = useState([]);
  const [globalDraft,   setGlobalDraft]   = useState({});

  // UI
  const [loading,       setLoading]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,         setError]         = useState('');

  const isEquipmentMode = !!selectedEquipment;
  const isGlobalMode    = !selectedEquipment;

  // ── Load equipment profile ───────────────────────────────────────────────
const loadEquipment = async (equipment) => {
  const eqId = equipment._id || equipment.id;
  setSelectedEquipment(equipment);
  setLoading(true);
  setError('');
  setSeuilProfile(null);
  setSeuilMeta(null);
  setSeuilDraft({});

  try {
    // 1. Essaie de charger le profil existant
    const res     = await getSeuilProfileByEquipmentId(eqId);
    const profile = res?.data || res;
    setSeuilProfile(profile);
    setSeuilMeta(profile?.meta || null);
    setSeuilDraft(buildDraftFromEquipment(equipment, profile?.thresholds || {}));

  } catch (err) {
    const isNotFound = err?.status === 404;

    if (isNotFound) {
      // 2. Pas de profil → essaie de régénérer avec l'IA
      try {
        const regenRes    = await regenerateSeuilProfile(eqId);
        const regenerated = regenRes?.data || regenRes;
        setSeuilProfile(regenerated);
        setSeuilMeta(regenerated?.meta || null);
        setSeuilDraft(buildDraftFromEquipment(equipment, regenerated?.thresholds || {}));
        Alert.alert('✅ Profile Generated', `AI generated a threshold profile for "${equipment.name}"`);

      } catch (regenErr) {
        // 3. IA indisponible → charge un draft vide mais éditable
        console.warn('[loadEquipment] AI unavailable, using default draft');
        setSeuilDraft(buildDraftFromEquipment(equipment, {}));
        setSeuilProfile(null);
        setSeuilMeta(null);
        // Message d'info — pas bloquant
        setError('⚠️ AI service unavailable. Default thresholds loaded — you can edit and save manually.');
      }

    } else {
      // Autre erreur réseau
      setError(err.message || 'Failed to load profile');
      setSeuilDraft(buildDraftFromEquipment(equipment, {}));
    }
  } finally {
    setLoading(false);
  }
};
  // ── Clear equipment selection (back to global mode) ──────────────────────
  const clearEquipmentSelection = () => {
    setSelectedEquipment(null);
    setSeuilDraft({});
    setSeuilProfile(null);
    setSeuilMeta(null);
    setError('');
  };

const handleRegenerate = async () => {
  if (!selectedEquipment) return;
  const eqId = selectedEquipment._id || selectedEquipment.id;
  setActionLoading(true);
  setError('');
  try {
    const res     = await regenerateSeuilProfile(eqId);
    const profile = res?.data || res;
    setSeuilProfile(profile);
    setSeuilMeta(profile?.meta || null);
    setSeuilDraft(buildDraftFromEquipment(selectedEquipment, profile?.thresholds || {}));
    Alert.alert('✅ Regenerated', `Thresholds regenerated for "${selectedEquipment.name}"`);

  } catch (err) {
    if (err?.status === 500) {
      // BackM down — message clair
      Alert.alert(
        '⚠️ AI Service Unavailable',
        'The AI service is not reachable. Please start BackM or edit thresholds manually.'
      );
    } else {
      Alert.alert('❌ Error', err.message || 'Regeneration failed');
    }
  } finally {
    setActionLoading(false);
  }
};

  // ── Update draft field ───────────────────────────────────────────────────
  const updateEquipmentDraft = (sensorType, field, value) => {
    setSeuilDraft((prev) => ({
      ...prev,
      [sensorType]: {
        ...(prev[sensorType] || buildDefaultThreshold(sensorType)),
        [field]: ['reason', 'mode'].includes(field) ? value : Number(value),
      },
    }));
  };

  const updateGlobalDraft = (sensorType, field, value) => {
    setGlobalDraft((prev) => ({
      ...prev,
      [sensorType]: {
        ...(prev[sensorType] || buildDefaultThreshold(sensorType)),
        [field]: ['reason', 'mode'].includes(field) ? value : Number(value),
      },
    }));
  };

  // ── Toggle global sensor ─────────────────────────────────────────────────
  const toggleGlobalSensor = (sensorValue) => {
    setGlobalSensors((prev) => {
      const next = prev.includes(sensorValue)
        ? prev.filter((s) => s !== sensorValue)
        : [...prev, sensorValue];

      // Keep draft in sync with selected sensors
      setGlobalDraft((prevDraft) => {
        const nd = {};
        next.forEach((s) => { nd[s] = prevDraft[s] || buildDefaultThreshold(s); });
        return nd;
      });

      return next;
    });
  };

  // ── Save (equipment mode) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedEquipment) return;
    const eqId = selectedEquipment._id || selectedEquipment.id;

    const thresholdsToSave = withUserMode(seuilDraft);
    const errors           = validateDraft(thresholdsToSave, SENSOR_CONFIG);
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors[0]);
      return;
    }

    setActionLoading(true);
    try {
      const payload  = {
        location:   selectedEquipment.location?.trim() || '',
        thresholds: thresholdsToSave,
        meta:       { ...(seuilMeta || {}) },
      };
      const response = await updateSeuilProfile(eqId, payload);
      const updated  = response?.data || response;
      setSeuilProfile(updated);
      setSeuilMeta(updated?.meta || null);
      setSeuilDraft(buildDraftFromEquipment(selectedEquipment, updated?.thresholds || {}));
      Alert.alert('✅ Saved', `Threshold profile updated for "${selectedEquipment.name}"`, [
        { text: 'OK', onPress: onClose },
      ]);
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'Failed to save thresholds');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Apply globally ───────────────────────────────────────────────────────
  const handleApplyGlobal = async () => {
    if (globalSensors.length === 0) {
      Alert.alert('', 'Select at least one sensor type');
      return;
    }

    const errors = validateDraft(globalDraft, SENSOR_CONFIG);
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors[0]);
      return;
    }

    const matchingEquipments = equipments.filter((eq) =>
      Array.isArray(eq.sensors) && eq.sensors.some((s) => globalSensors.includes(s))
    );

    if (matchingEquipments.length === 0) {
      Alert.alert('', 'No equipment matches the selected sensor types');
      return;
    }

    setActionLoading(true);
    try {
      let updatedCount = 0;

      for (const eq of matchingEquipments) {
        const eqId = eq._id || eq.id;
        if (!eqId) continue;

        let existingProfile = null;
        try {
          const r      = await getSeuilProfileByEquipmentId(eqId);
          existingProfile = r?.data || r;
        } catch {}

        // Merge: only update sensors the equipment actually has
        const merged = { ...(existingProfile?.thresholds || {}) };
        (eq.sensors || []).forEach((s) => {
          if (globalDraft[s]) merged[s] = { ...globalDraft[s] };
          else if (!merged[s]) merged[s] = buildDefaultThreshold(s);
        });

        await updateSeuilProfile(eqId, {
          location:   eq.location?.trim() || '',
          thresholds: merged,
          meta:       { ...(existingProfile?.meta || {}) },
        });
        updatedCount += 1;
      }

      Alert.alert(
        '✅ Success',
        `Global thresholds applied to ${updatedCount} equipment(s)`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'Failed to apply global thresholds');
    } finally {
      setActionLoading(false);
    }
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Manage Thresholds</Text>
          <Text style={styles.headerSubtitle}>
            {isEquipmentMode
              ? `Equipment: ${selectedEquipment.name}`
              : 'Global mode — configure by sensor type'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Section: Equipment Selection ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Equipment Selection</Text>

          <TouchableOpacity
            style={styles.equipmentPicker}
            onPress={() => setShowPickerModal(true)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.equipmentPickerText,
              !selectedEquipment && { color: '#9CA3AF' },
            ]}>
              {selectedEquipment
                ? `${selectedEquipment.name} — ${selectedEquipment.nodeId}`
                : 'Type or select equipment...'}
            </Text>
            <ChevronDown size={18} color="#6B7280" />
          </TouchableOpacity>

          {selectedEquipment && (
            <TouchableOpacity onPress={clearEquipmentSelection} style={styles.clearBtn}>
              <X size={14} color="#EF4444" />
              <Text style={styles.clearBtnText}>Clear selection (switch to global mode)</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.helperText}>
            Leave empty to configure thresholds globally by sensor type.
          </Text>

          {seuilMeta && (
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>
                Provider: <Text style={{ fontWeight: '700' }}>{seuilMeta.provider || '—'}</Text>
                {'  '}|{'  '}
                Model: <Text style={{ fontWeight: '700' }}>{seuilMeta.model || '—'}</Text>
                {'  '}|{'  '}
                Sensor Data: <Text style={{ fontWeight: '700' }}>{seuilMeta.usedSensorData ? 'Yes' : 'No'}</Text>
              </Text>
            </View>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* ── Section: Global Sensor Picker (global mode only) ── */}
        {isGlobalMode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Select Sensor Types</Text>
            <Text style={styles.helperText}>
              The thresholds you define here will be applied to all equipments that contain the selected sensor types.
            </Text>
            <View style={styles.typeGrid}>
              {SENSOR_TYPES.map(({ value: val, label, Icon: Ico, color }) => {
                const active = globalSensors.includes(val);
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.typeCard, active && { borderColor: color, backgroundColor: `${color}18` }]}
                    onPress={() => toggleGlobalSensor(val)}
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
            {globalSensors.length > 0 && (
              <Text style={styles.helperText}>
                Selected: <Text style={{ fontWeight: '700', color: '#111827' }}>{globalSensors.join(', ')}</Text>
              </Text>
            )}
          </View>
        )}

        {/* ── Section: Threshold Configuration ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Threshold Configuration</Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="#8B5CF6" />
              <Text style={styles.loadingText}>Loading threshold profile...</Text>
            </View>
          ) : isGlobalMode && globalSensors.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Sensors Selected</Text>
              <Text style={styles.emptyText}>Select one or more sensor types above to configure global thresholds.</Text>
            </View>
          ) : isEquipmentMode && Object.keys(seuilDraft).length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Threshold Draft</Text>
              <Text style={styles.emptyText}>This equipment may not have any attached sensors.</Text>
            </View>
          ) : (
            Object.entries(isEquipmentMode ? seuilDraft : globalDraft).map(([sensorType, draft]) => (
              <ThresholdEditor
                key={`${isEquipmentMode ? (selectedEquipment._id || selectedEquipment.id) : 'global'}-${sensorType}`}
                sensorType={sensorType}
                draft={draft}
                isEquipmentMode={isEquipmentMode}
                onChange={isEquipmentMode ? updateEquipmentDraft : updateGlobalDraft}
              />
            ))
          )}
        </View>

        {/* Notice */}
        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            ⚠️ Thresholds are saved per equipment and only for sensors attached to that equipment.
          </Text>
        </View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>
        {/* Regenerate (equipment mode only) */}
        {isEquipmentMode && (
          <TouchableOpacity
            style={styles.btnRegen}
            onPress={handleRegenerate}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            {actionLoading
              ? <ActivityIndicator size="small" color="#8B5CF6" />
              : <RefreshCw size={16} color="#8B5CF6" />
            }
            <Text style={styles.btnRegenText}>
              {actionLoading ? 'Regenerating...' : 'Regenerate'}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.footerRight}>
          {/* Cancel */}
          <TouchableOpacity
            style={styles.btnCancel}
            onPress={onClose}
            disabled={actionLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>

          {/* Save / Apply */}
          <TouchableOpacity
            style={[
              styles.btnSaveWrapper,
              (actionLoading || (isGlobalMode && globalSensors.length === 0)) && { opacity: 0.6 },
            ]}
            onPress={isEquipmentMode ? handleSave : handleApplyGlobal}
            disabled={actionLoading || loading || (isGlobalMode && globalSensors.length === 0)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btnSave}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.btnSaveText}>
                    {isEquipmentMode ? 'Save Profile' : 'Apply to All'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Equipment Picker Modal ── */}
      <Modal visible={showPickerModal} animationType="slide" transparent>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Equipment</Text>
              <TouchableOpacity onPress={() => setShowPickerModal(false)}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
              {equipments.length === 0 ? (
                <Text style={[styles.helperText, { padding: 20, textAlign: 'center' }]}>
                  No equipment registered yet.
                </Text>
              ) : (
                equipments.map((eq) => {
                  const eqId   = eq._id || eq.id;
                  const isActive = selectedEquipment && (selectedEquipment._id || selectedEquipment.id) === eqId;
                  return (
                    <TouchableOpacity
                      key={eqId}
                      style={[styles.pickerOption, isActive && styles.pickerOptionActive]}
                      onPress={() => {
                        setShowPickerModal(false);
                        loadEquipment(eq);
                      }}
                      activeOpacity={0.7}
                    >
                      <View>
                        <Text style={[styles.pickerOptionName, isActive && { color: '#8B5CF6' }]}>
                          {eq.name}
                        </Text>
                        <Text style={styles.pickerOptionSub}>
                          {eq.nodeId} • {eq.location || 'No location'}
                        </Text>
                        {eq.sensors && eq.sensors.length > 0 && (
                          <Text style={styles.pickerOptionSensors}>
                            Sensors: {eq.sensors.join(', ')}
                          </Text>
                        )}
                      </View>
                      {isActive && (
                        <View style={styles.pickerActiveBadge}>
                          <Text style={styles.pickerActiveBadgeText}>Selected</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.pickerClearBtn}
              onPress={() => {
                setShowPickerModal(false);
                clearEquipmentSelection();
              }}
            >
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:              { flex: 1, backgroundColor: '#F9FAFB' },
  header:                 { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 20 },
  backButton:             { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:            { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSubtitle:         { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  body:                   { padding: 20 },
  section:                { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  sectionTitle:           { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },

  equipmentPicker:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#F9FAFB' },
  equipmentPickerText:    { fontSize: 14, color: '#111827', flex: 1 },
  clearBtn:               { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  clearBtnText:           { fontSize: 13, color: '#EF4444' },
  helperText:             { fontSize: 12, color: '#6B7280', marginTop: 6 },
  errorText:              { fontSize: 13, color: '#EF4444', fontWeight: '600', marginTop: 8 },
  metaBadge:              { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginTop: 10 },
  metaText:               { fontSize: 12, color: '#6B7280' },

  typeGrid:               { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  typeCard:               { width: '30%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent', gap: 6 },
  typeIconBox:            { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel:              { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  loadingBox:             { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText:            { fontSize: 14, color: '#6B7280' },
  emptyBox:               { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyTitle:             { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyText:              { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  // Threshold card
  thresholdCard:          { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 14, padding: 16, marginBottom: 16, backgroundColor: '#FAFAFA' },
  thresholdCardHeader:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  thresholdIconBox:       { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  thresholdTitle:         { fontSize: 15, fontWeight: '700', color: '#111827' },
  thresholdHint:          { fontSize: 12, color: '#6B7280', marginTop: 1 },
  thresholdGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  thresholdFieldHalf:     { width: '47%', flexGrow: 1 },
  thresholdLabel:         { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 5 },
  thresholdInput:         { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  thresholdInputDisabled: { backgroundColor: '#F3F4F6', justifyContent: 'center' },

  notice:                 { backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginTop: 4 },
  noticeText:             { fontSize: 12, color: '#92400E', fontWeight: '500' },

  // Footer
  footer:                 { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 14, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  btnRegen:               { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.05)' },
  btnRegenText:           { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  footerRight:            { flex: 1, flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  btnCancel:              { paddingVertical: 13, paddingHorizontal: 18, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancelText:          { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  btnSaveWrapper:         { borderRadius: 12, overflow: 'hidden', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  btnSave:                { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 20, gap: 8 },
  btnSaveText:            { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Picker modal
  pickerOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerModal:            { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  pickerHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerTitle:            { fontSize: 18, fontWeight: '700', color: '#111827' },
  pickerOption:           { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerOptionActive:     { backgroundColor: 'rgba(139,92,246,0.07)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  pickerOptionName:       { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  pickerOptionSub:        { fontSize: 12, color: '#6B7280', fontFamily: 'Courier New' },
  pickerOptionSensors:    { fontSize: 11, color: '#8B5CF6', marginTop: 3 },
  pickerActiveBadge:      { backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pickerActiveBadgeText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  pickerClearBtn:         { marginTop: 12, padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  pickerClearText:        { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});

export default ManageSeuils;