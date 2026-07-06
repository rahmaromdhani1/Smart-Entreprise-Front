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
  ArrowLeft, RefreshCw, ChevronDown, X, Bot, AlertTriangle, Lock,
} from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity, PlugZap,
} from 'lucide-react-native';
import {
  getSeuilProfileByEquipmentId,
  regenerateSeuilProfile,
  updateSeuilProfile,
  globalUpdateSensorThreshold,
  globalRegenerateSensorThreshold,
} from '../../Service/SeuilApi';

// ─── Constants ────────────────────────────────────────────────────────────────

const SENSOR_TYPES = [
  { value: 'temperature', label: 'Temperature', Icon: Thermometer, color: '#EF4444' },
  { value: 'light',       label: 'Light',       Icon: Sun,         color: '#F59E0B' },
  { value: 'humidity',    label: 'Humidity',    Icon: Droplets,    color: '#3B82F6' },
  { value: 'pressure',    label: 'Pressure',    Icon: Gauge,       color: '#8B5CF6' },
  { value: 'co2',         label: 'CO₂',         Icon: Wind,        color: '#06B6D4' },
  { value: 'motion',      label: 'Motion',      Icon: Activity,    color: '#6366F1' },
  { value: 'energy',      label: 'Energy',      Icon: PlugZap,     color: '#F59E0B' }, // ── ADDED ──
];

// ── ADDED: energy is excluded from threshold management (mirrors web) ──
const THRESHOLD_SENSOR_TYPES  = SENSOR_TYPES.filter((s) => s.value !== 'energy');
const THRESHOLD_SENSOR_VALUES = new Set(THRESHOLD_SENSOR_TYPES.map((s) => s.value));

const SENSOR_CONFIG = {
  temperature: { min: -50,   max: 150,    unit: '°C',  label: 'Temperature' },
  light:       { min: 0,     max: 200000, unit: 'lux', label: 'Light'       },
  humidity:    { min: 0,     max: 100,    unit: '%',   label: 'Humidity'    },
  pressure:    { min: 300,   max: 1100,   unit: 'hPa', label: 'Pressure'    },
  co2:         { min: 0,     max: 50000,  unit: 'ppm', label: 'CO₂'         },
  motion:      { min: 0,     max: 1,      unit: '0/1', label: 'Motion'      },
  energy:      { min: 0,     max: 100000, unit: 'kWh', label: 'Energy'      }, // ── ADDED ──
};

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** ── ADDED: mirrors web isThresholdSensor ── */
const isThresholdSensor = (sensorType) => THRESHOLD_SENSOR_VALUES.has(sensorType);

/** ── ADDED: mirrors web getThresholdSensors ── */
const getThresholdSensors = (equipment) =>
  (Array.isArray(equipment?.sensors) ? equipment.sensors : []).filter(isThresholdSensor);

/**
 * VISUAL FALLBACK ONLY — _isFallback: true marks a placeholder never persisted.
 * Saving a fallback is blocked (mirrors web guard).
 * ── CHANGED: guards against non-threshold sensors ──
 */
const buildDefaultThreshold = (sensorType) => {
  if (!isThresholdSensor(sensorType)) return null; // ── ADDED guard ──
  const cfg = SENSOR_CONFIG[sensorType];
  if (!cfg) return null;
  const mid = (cfg.min + cfg.max) / 2;
  return {
    min:         Number((mid - (cfg.max - cfg.min) * 0.1).toFixed(2)),
    max:         Number((mid + (cfg.max - cfg.min) * 0.1).toFixed(2)),
    threshold:   Number(mid.toFixed(2)),
    hysteresis:  sensorType === 'temperature' ? 0.5 : sensorType === 'humidity' ? 2 : 50,
    confidence:  0.5,
    mode:        'ai',
    reason:      '',
    _isFallback: true,
  };
};

/**
 * ── CHANGED: skips non-threshold sensors (e.g. energy) ──
 */
const buildDraftFromEquipment = (equipment, existingThresholds = {}) => {
  const draft = {};
  (equipment?.sensors || []).forEach((s) => {
    if (!isThresholdSensor(s)) return; // ── ADDED ──
    const threshold = existingThresholds[s] || buildDefaultThreshold(s);
    if (threshold) draft[s] = threshold;
  });
  return draft;
};

/**
 * ── CHANGED: skips non-threshold sensors ──
 */
const buildDraftFromSensorTypes = (sensorTypes = [], existingThresholds = {}) => {
  const draft = {};
  sensorTypes.forEach((s) => {
    if (!isThresholdSensor(s)) return; // ── ADDED ──
    const threshold = existingThresholds[s] || buildDefaultThreshold(s);
    if (threshold) draft[s] = threshold;
  });
  return draft;
};

/** Strip _isFallback and force mode = 'user' before saving. */
const withUserMode = (thresholds = {}) =>
  Object.fromEntries(
    Object.entries(thresholds).map(([k, v]) => {
      const { _isFallback, ...clean } = v;
      return [k, { ...clean, mode: 'user' }];
    })
  );

/** Full validation matching web's validateThresholdDraft. */
const validateDraft = (thresholds) => {
  const errors = [];
  Object.entries(thresholds || {}).forEach(([sensorType, t]) => {
    const cfg = SENSOR_CONFIG[sensorType];
    if (!cfg || !t) { errors.push(`${sensorType}: invalid config`); return; }
    const min        = Number(t.min);
    const max        = Number(t.max);
    const threshold  = Number(t.threshold);
    const hysteresis = Number(t.hysteresis ?? 0);
    const confidence = Number(t.confidence ?? 0.5);
    if ([min, max, threshold].some((n) => Number.isNaN(n))) {
      errors.push(`${sensorType}: all numeric fields must be valid numbers`); return;
    }
    if (min > max)
      errors.push(`${sensorType}: min cannot be greater than max`);
    if (threshold < min || threshold > max)
      errors.push(`${sensorType}: threshold must be between min and max`);
    if (hysteresis < 0)
      errors.push(`${sensorType}: hysteresis must be >= 0`);
    if (confidence < 0 || confidence > 1)
      errors.push(`${sensorType}: confidence must be between 0 and 1`);
    if (min < cfg.min || min > cfg.max)
      errors.push(`${sensorType}: min must be between ${cfg.min} and ${cfg.max} ${cfg.unit}`);
    if (max < cfg.min || max > cfg.max)
      errors.push(`${sensorType}: max must be between ${cfg.min} and ${cfg.max} ${cfg.unit}`);
    if (threshold < cfg.min || threshold > cfg.max)
      errors.push(`${sensorType}: threshold must be between ${cfg.min} and ${cfg.max} ${cfg.unit}`);
  });
  return errors;
};

// ─── ThresholdEditor ──────────────────────────────────────────────────────────

const ThresholdEditor = ({ sensorType, draft, onChange }) => {
  const cfg        = SENSOR_CONFIG[sensorType];
  const sensorMeta = SENSOR_TYPES.find((s) => s.value === sensorType);
  if (!cfg || !draft) return null;

  const { Icon, color } = sensorMeta || {};
  const isUserDefined   = draft.mode === 'user';
  const isFallback      = draft._isFallback === true;

  const cardBorderColor = isUserDefined ? '#BBF7D0' : isFallback ? '#FCD34D' : '#E5E7EB';
  const cardBgColor     = isUserDefined ? '#F0FDF4' : isFallback ? '#FFFBEB' : '#FAFAFA';

  return (
    <View style={[styles.thresholdCard, { borderColor: cardBorderColor, backgroundColor: cardBgColor }]}>

      {/* Header */}
      <View style={styles.thresholdCardHeader}>
        {Icon && (
          <View style={[styles.thresholdIconBox, { backgroundColor: `${color}18` }]}>
            <Icon size={18} color={color} strokeWidth={2} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.thresholdTitle}>{cfg.label}</Text>
          <Text style={styles.thresholdHint}>
            {draft.min ?? '?'} – {draft.max ?? '?'} {cfg.unit}
          </Text>
        </View>
        <View style={[styles.modeBadge, { backgroundColor: isUserDefined ? '#D1FAE5' : '#EDE9FE' }]}>
          <Text style={[styles.modeBadgeText, { color: isUserDefined ? '#065F46' : '#5B21B6' }]}>
            {isUserDefined ? '👤 User' : '🤖 AI'}
          </Text>
        </View>
      </View>

      {/* Fallback warning */}
      {isFallback && (
        <View style={styles.fallbackWarning}>
          <AlertTriangle size={14} color="#92400E" />
          <Text style={styles.fallbackWarningText}>
            No AI threshold in DB yet — tap Regenerate with AI or fill fields below.
          </Text>
        </View>
      )}

      {/* AI description */}
      {draft.description && !isFallback && (
        <View style={styles.aiDescription}>
          <Text style={styles.aiDescriptionText}>{draft.description}</Text>
        </View>
      )}

      {/* Numeric fields */}
      <View style={styles.thresholdGrid}>
        {[
          { key: 'min',       label: `Min (${cfg.unit})`    },
          { key: 'max',       label: `Max (${cfg.unit})`    },
          { key: 'threshold', label: `Target (${cfg.unit})` },
        ].map(({ key, label }) => (
          <View key={key} style={styles.thresholdFieldHalf}>
            <Text style={styles.thresholdLabel}>{label}</Text>
            <TextInput
              style={[
                styles.thresholdInput,
                key === 'threshold' && styles.thresholdInputTarget,
              ]}
              keyboardType="decimal-pad"
              value={String(draft[key] ?? '')}
              onChangeText={(v) => onChange(sensorType, key, v)}
            />
          </View>
        ))}
      </View>

      {/* Reason */}
      <View style={{ marginTop: 8 }}>
        <Text style={styles.thresholdLabel}>Reason</Text>
        <TextInput
          style={[styles.thresholdInput, styles.thresholdReasonInput]}
          placeholder="Why this threshold? (optional)"
          placeholderTextColor="#9CA3AF"
          value={draft.reason || ''}
          onChangeText={(v) => onChange(sensorType, 'reason', v)}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
        />
        {isUserDefined && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 5 }}>
            <Lock size={14} color="#065F46" style={{ marginTop: 2 }} />
            <Text style={styles.userDefinedText}>
              User-defined — AI will never modify this sensor automatically.
            </Text>
          </View>
        )}
      </View>

    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * ManageSeuils
 * Props:
 *   onClose     () => void
 *   equipments  Equipment[]
 */
const ManageSeuils = ({ onClose, equipments = [] }) => {
  const insets = useSafeAreaInsets();

  // Equipment selection
  const [selectedEquipment, setSelectedEquipment] = useState(null);
  const [showPickerModal,   setShowPickerModal]   = useState(false);

  // Equipment-mode state
  const [seuilDraft,   setSeuilDraft]   = useState({});
  const [seuilProfile, setSeuilProfile] = useState(null);
  const [seuilMeta,    setSeuilMeta]    = useState(null);

  // Global mode — single-select radio (mirrors web)
  const [globalSensor, setGlobalSensor] = useState('');
  const [globalDraft,  setGlobalDraft]  = useState({});

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

    // ── ADDED: skip if no threshold-eligible sensors ──
    if (getThresholdSensors(equipment).length === 0) {
      setLoading(false);
      setError('');
      setSeuilDraft({});
      return;
    }

    try {
      const res     = await getSeuilProfileByEquipmentId(eqId);
      const profile = res?.data || res;
      setSeuilProfile(profile);
      setSeuilMeta(profile?.meta || null);
      setSeuilDraft(buildDraftFromEquipment(equipment, profile?.thresholds || {}));

    } catch (err) {
      const isNotFound = err?.status === 404;
      if (isNotFound) {
        try {
          const regenRes    = await regenerateSeuilProfile(eqId);
          const regenerated = regenRes?.data || regenRes;
          setSeuilProfile(regenerated);
          setSeuilMeta(regenerated?.meta || null);
          setSeuilDraft(buildDraftFromEquipment(equipment, regenerated?.thresholds || {}));
          Alert.alert('✅ Profile Generated', `AI generated a threshold profile for "${equipment.name}"`);
        } catch (regenErr) {
          console.warn('[ManageSeuils] AI unavailable, using default draft');
          setSeuilDraft(buildDraftFromEquipment(equipment, {}));
          setSeuilProfile(null);
          setSeuilMeta(null);
          setError('⚠️ AI service unavailable. Default thresholds loaded — you can edit and save manually.');
        }
      } else {
        setError(err.message || 'Failed to load profile');
        setSeuilDraft(buildDraftFromEquipment(equipment, {}));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Clear selection → back to global mode ───────────────────────────────
  const clearEquipmentSelection = () => {
    setSelectedEquipment(null);
    setSeuilDraft({});
    setSeuilProfile(null);
    setSeuilMeta(null);
    setError('');
  };

  // ── Regenerate with AI (equipment mode) ─────────────────────────────────
  const handleRegenerate = async () => {
    if (!selectedEquipment) return;
    // ── ADDED: guard for no threshold sensors ──
    if (getThresholdSensors(selectedEquipment).length === 0) {
      Alert.alert('', 'This equipment has no sensors that need seuil.');
      return;
    }
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
        Alert.alert('⚠️ AI Service Unavailable', 'The AI service is not reachable. Please edit thresholds manually.');
      } else {
        Alert.alert('❌ Error', err.message || 'Regeneration failed');
      }
    } finally {
      setActionLoading(false);
    }
  };

  // ── Update draft field helpers ───────────────────────────────────────────
  const updateEquipmentDraft = (sensorType, field, value) => {
    setSeuilDraft((prev) => {
      const { _isFallback, ...existing } = prev[sensorType] || buildDefaultThreshold(sensorType);
      return {
        ...prev,
        [sensorType]: {
          ...existing,
          [field]: ['reason', 'mode'].includes(field) ? value : Number(value),
        },
      };
    });
  };

  const updateGlobalDraft = (sensorType, field, value) => {
    setGlobalDraft((prev) => {
      const { _isFallback, ...existing } = prev[sensorType] || buildDefaultThreshold(sensorType);
      return {
        ...prev,
        [sensorType]: {
          ...existing,
          [field]: ['reason', 'mode'].includes(field) ? value : Number(value),
        },
      };
    });
  };

  // ── Global sensor = single-select radio (mirrors web) ───────────────────
  const selectGlobalSensor = (sensorValue) => {
    setGlobalSensor(sensorValue);
    setGlobalDraft(buildDraftFromSensorTypes([sensorValue], {}));
  };

  // ── Save (equipment mode) ────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedEquipment) return;
    const eqId = selectedEquipment._id || selectedEquipment.id;

    // _isFallback guard
    const fallbackSensors = Object.entries(seuilDraft)
      .filter(([, t]) => t?._isFallback === true)
      .map(([s]) => s);

    if (fallbackSensors.length > 0) {
      Alert.alert(
        '❌ Missing AI Threshold',
        `Sensor${fallbackSensors.length > 1 ? 's' : ''} [${fallbackSensors.join(', ')}] have no AI threshold yet — tap Regenerate with AI first.`
      );
      return;
    }

    const thresholdsToSave = withUserMode(seuilDraft);
    const errors           = validateDraft(thresholdsToSave);
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors[0]);
      return;
    }

    setActionLoading(true);
    try {
      // ── CHANGED: use floor + officeRoom instead of location (mirrors web) ──
      const payload = {
        floor:      selectedEquipment.floor?.trim()      || '',
        officeRoom: selectedEquipment.officeRoom?.trim() || '',
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
    if (!globalSensor) {
      Alert.alert('', 'Please select a sensor type first');
      return;
    }
    const draft = globalDraft[globalSensor];
    if (!draft) {
      Alert.alert('', 'No threshold values configured');
      return;
    }
    const errors = validateDraft({ [globalSensor]: draft });
    if (errors.length > 0) {
      Alert.alert('Validation Error', errors[0]);
      return;
    }
    setActionLoading(true);
    try {
      const payload = {
        min:        draft.min,
        max:        draft.max,
        threshold:  draft.threshold,
        hysteresis: draft.hysteresis ?? 0,
        reason:     draft.reason ?? '',
      };
      const result = await globalUpdateSensorThreshold(globalSensor, payload);
      Alert.alert(
        '✅ Success',
        result?.message || `Global update applied to ${result?.data?.updatedCount ?? '?'} equipment(s)`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'Failed to apply global update');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Generate with AI for all (global mode) ──────────────────────────────
  const handleGlobalAIRegenerate = async () => {
    if (!globalSensor) {
      Alert.alert('', 'Please select a sensor type first');
      return;
    }
    setActionLoading(true);
    try {
      const result = await globalRegenerateSensorThreshold(globalSensor);
      Alert.alert(
        '✅ AI Regenerated',
        `AI updated ${result?.data?.updatedCount ?? '?'} equipment(s). Skipped ${result?.data?.skippedCount ?? 0} user-defined.`,
        [{ text: 'OK', onPress: onClose }]
      );
    } catch (err) {
      Alert.alert('❌ Error', err.message || 'Failed to globally regenerate');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Equipment count for selected global sensor ───────────────────────────
  const globalSensorEquipmentCount = globalSensor
    ? equipments.filter((eq) => Array.isArray(eq.sensors) && eq.sensors.includes(globalSensor)).length
    : 0;

  // ── Format floor + officeRoom for display in picker ──────────────────────
  const formatEquipmentLocation = (eq) =>
    [eq.floor, eq.officeRoom].filter(Boolean).join(' — ') || 'No location';

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
        contentContainerStyle={[styles.body, { paddingBottom: 130 + insets.bottom }]}
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
            <Text style={[styles.equipmentPickerText, !selectedEquipment && { color: '#9CA3AF' }]}>
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
            <Text style={styles.sectionTitle}>Global Sensor Configuration</Text>
            <Text style={styles.helperText}>Select a sensor type to configure globally.</Text>

            {/* ── CHANGED: uses THRESHOLD_SENSOR_TYPES — energy excluded ── */}
            <View style={styles.typeGrid}>
              {THRESHOLD_SENSOR_TYPES.map(({ value: val, label, Icon: Ico, color }) => {
                const active = globalSensor === val;
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.typeCard, active && { borderColor: color, backgroundColor: `${color}18` }]}
                    onPress={() => selectGlobalSensor(val)}
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

            {globalSensor !== '' && (
              <View style={styles.globalInfoBox}>
                <Text style={styles.globalInfoText}>
                  <Text style={{ fontWeight: '700' }}>{globalSensorEquipmentCount}</Text>
                  {' '}equipment{globalSensorEquipmentCount !== 1 ? 's' : ''} have the{' '}
                  <Text style={{ fontWeight: '700' }}>{globalSensor}</Text> sensor.
                  {globalSensorEquipmentCount > 0 && (
                    <Text style={{ color: '#6B7280' }}>
                      {' '}Equipment with user-defined thresholds will not be changed by AI.
                    </Text>
                  )}
                </Text>
              </View>
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
          ) : isGlobalMode && !globalSensor ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Sensor Selected</Text>
              <Text style={styles.emptyText}>Select a sensor type above to configure global thresholds.</Text>
            </View>
          ) : isEquipmentMode && Object.keys(seuilDraft).length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No Threshold Draft</Text>
              {/* ── CHANGED: updated message to mention Energy ── */}
              <Text style={styles.emptyText}>
                This equipment may only have sensors that do not need seuil, like Energy.
              </Text>
            </View>
          ) : (
            Object.entries(isEquipmentMode ? seuilDraft : globalDraft).map(([sensorType, draft]) => (
              <ThresholdEditor
                key={`${isEquipmentMode ? (selectedEquipment._id || selectedEquipment.id) : 'global'}-${sensorType}`}
                sensorType={sensorType}
                draft={draft}
                onChange={isEquipmentMode ? updateEquipmentDraft : updateGlobalDraft}
              />
            ))
          )}
        </View>

        {/* Notice */}
        <View style={styles.notice}>
          <AlertTriangle size={16} color="#92400E" />
          <Text style={styles.noticeText}>
            Thresholds are saved per equipment and only for sensors attached to that equipment.
          </Text>
        </View>

      </ScrollView>

      {/* ── Footer ── */}
      <View style={[styles.footer, { paddingBottom: 16 + insets.bottom }]}>

        <View style={styles.footerLeft}>
          {isEquipmentMode && (
            <TouchableOpacity style={styles.btnRegen} onPress={handleRegenerate} disabled={actionLoading}>
              {actionLoading
                ? <ActivityIndicator size="small" color="#8B5CF6" />
                : <RefreshCw size={16} color="#8B5CF6" />
              }
              <Text style={styles.btnRegenText}>
                {actionLoading ? 'Regenerating...' : 'Regenerate'}
              </Text>
            </TouchableOpacity>
          )}

          {isGlobalMode && globalSensor !== '' && (
            <TouchableOpacity style={styles.btnAIGlobal} onPress={handleGlobalAIRegenerate} disabled={actionLoading}>
              <Bot size={16} color="#5B21B6" />
              <Text style={styles.btnAIGlobalText}>
                {actionLoading ? 'Generating...' : 'AI for all'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerRight}>
          <TouchableOpacity style={styles.btnCancel} onPress={onClose}>
            <Text style={styles.btnCancelText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnSaveWrapper}
            onPress={isEquipmentMode ? handleSave : handleApplyGlobal}
            disabled={actionLoading}
          >
            <LinearGradient colors={['#8B5CF6', '#EC4899']} style={styles.btnSave}>
              <Text style={styles.btnSaveText}>
                {actionLoading ? 'Saving...' : isEquipmentMode ? 'Apply' : 'Apply Global'}
              </Text>
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
                  const eqId     = eq._id || eq.id;
                  const isActive = selectedEquipment && (selectedEquipment._id || selectedEquipment.id) === eqId;
                  // ── CHANGED: show floor+officeRoom ──
                  const locationStr = formatEquipmentLocation(eq);
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
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pickerOptionName, isActive && { color: '#8B5CF6' }]}>
                          {eq.name}
                        </Text>
                        <Text style={styles.pickerOptionSub}>
                          {eq.nodeId} • {locationStr}
                        </Text>
                        {eq.sensors && eq.sensors.length > 0 && (
                          <Text style={styles.pickerOptionSensors}>
                            Sensors: {eq.sensors.join(', ')}
                          </Text>
                        )}
                        {/* ── ADDED: warn if no threshold-eligible sensors ── */}
                        {getThresholdSensors(eq).length === 0 && (
                          <Text style={styles.pickerOptionNoThreshold}>
                            ⚠️ No threshold-eligible sensors
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
              <Text style={styles.pickerClearText}>Switch to Global Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:           { flex: 1, backgroundColor: '#F9FAFB' },
  header:              { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingBottom: 20 },
  backButton:          { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerTitle:         { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 2 },
  headerSubtitle:      { fontSize: 13, color: 'rgba(255,255,255,0.85)' },

  body:                { padding: 20 },
  section:             { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  sectionTitle:        { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },

  equipmentPicker:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#F9FAFB' },
  equipmentPickerText: { fontSize: 14, color: '#111827', flex: 1 },
  clearBtn:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  clearBtnText:        { fontSize: 13, color: '#EF4444' },
  helperText:          { fontSize: 12, color: '#6B7280', marginTop: 6 },
  errorText:           { fontSize: 13, color: '#EF4444', fontWeight: '600', marginTop: 8 },
  metaBadge:           { backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, marginTop: 10 },
  metaText:            { fontSize: 12, color: '#6B7280' },

  typeGrid:            { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  typeCard:            { width: '30%', flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: 'transparent', gap: 6 },
  typeIconBox:         { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  typeLabel:           { fontSize: 11, fontWeight: '600', color: '#6B7280', textAlign: 'center' },

  globalInfoBox:       { marginTop: 10, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8 },
  globalInfoText:      { fontSize: 13, color: '#374151' },

  loadingBox:          { alignItems: 'center', paddingVertical: 30, gap: 12 },
  loadingText:         { fontSize: 14, color: '#6B7280' },
  emptyBox:            { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyTitle:          { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyText:           { fontSize: 13, color: '#9CA3AF', textAlign: 'center' },

  thresholdCard:       { borderWidth: 2, borderRadius: 14, padding: 16, marginBottom: 16 },
  thresholdCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  thresholdIconBox:    { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  thresholdTitle:      { fontSize: 15, fontWeight: '700', color: '#111827' },
  thresholdHint:       { fontSize: 12, color: '#6B7280', marginTop: 1 },
  modeBadge:           { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  modeBadgeText:       { fontSize: 11, fontWeight: '700' },
  fallbackWarning:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FCD34D', borderRadius: 8, padding: 10, marginBottom: 12 },
  fallbackWarningText: { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },
  aiDescription:       { backgroundColor: '#EDE9FE', borderRadius: 8, padding: 10, marginBottom: 14 },
  aiDescriptionText:   { fontSize: 13, color: '#5B21B6', fontStyle: 'italic' },

  thresholdGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
  thresholdFieldHalf:  { width: '47%', flexGrow: 1 },
  thresholdLabel:      { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 5 },
  thresholdInput:      { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: '#111827', backgroundColor: '#fff' },
  thresholdInputTarget: { borderWidth: 2, borderColor: '#8B5CF6', fontWeight: '700', color: '#5B21B6' },
  thresholdReasonInput: { minHeight: 60, paddingTop: 10, textAlignVertical: 'top' },
  userDefinedText:     { fontSize: 12, color: '#065F46', fontWeight: '600' },

  notice:              { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF3C7', padding: 12, borderRadius: 10, marginTop: 4 },
  noticeText:          { flex: 1, fontSize: 12, color: '#92400E', fontWeight: '500' },

  footer:              { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 20, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft:          { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerRight:         { flexDirection: 'row', alignItems: 'center', gap: 10 },

  btnRegen:            { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#8B5CF6', borderRadius: 12, backgroundColor: 'rgba(139,92,246,0.05)' },
  btnRegenText:        { fontSize: 13, fontWeight: '600', color: '#8B5CF6' },
  btnAIGlobal:         { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderWidth: 2, borderColor: '#8B5CF6', borderRadius: 12, backgroundColor: '#EDE9FE' },
  btnAIGlobalText:     { fontSize: 13, fontWeight: '600', color: '#5B21B6' },
  btnCancel:           { paddingVertical: 13, paddingHorizontal: 18, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnCancelText:       { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  btnSaveWrapper:      { borderRadius: 12, overflow: 'hidden', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
  btnSave:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, paddingHorizontal: 20, gap: 8 },
  btnSaveText:         { fontSize: 14, fontWeight: '700', color: '#fff' },

  pickerOverlay:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  pickerModal:            { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  pickerHeader:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  pickerTitle:            { fontSize: 18, fontWeight: '700', color: '#111827' },
  pickerOption:           { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, backgroundColor: '#F9FAFB', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerOptionActive:     { backgroundColor: 'rgba(139,92,246,0.07)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.3)' },
  pickerOptionName:       { fontSize: 15, fontWeight: '600', color: '#111827', marginBottom: 3 },
  pickerOptionSub:        { fontSize: 12, color: '#6B7280', fontFamily: 'Courier New' },
  pickerOptionSensors:    { fontSize: 11, color: '#8B5CF6', marginTop: 3 },
  pickerOptionNoThreshold:{ fontSize: 11, color: '#F59E0B', marginTop: 2, fontWeight: '600' }, // ── ADDED ──
  pickerActiveBadge:      { backgroundColor: '#8B5CF6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  pickerActiveBadgeText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  pickerClearBtn:         { marginTop: 12, padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  pickerClearText:        { fontSize: 14, fontWeight: '600', color: '#EF4444' },
});

export default ManageSeuils;