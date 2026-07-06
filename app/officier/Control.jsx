// app/officier/Control.jsx  (Chef / Officier)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { Server, ShieldCheck, Eye, ServerCrash, WifiOff } from 'lucide-react-native';
import {
  Lightbulb, Wind, Video, Lock, Flame, Droplet,
  Thermometer, Sun, Droplets, Gauge, Activity, PlugZap,
  Bell, Waves, Fan, Zap, Power,
} from 'lucide-react-native';
import { getEquipments, getLiveDeviceStatuses } from '../../Service/EquipmentApi';
import { useActuatorSync } from '../../hook/Useactuatorsync ';

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── NodeIcon ──────────────────────────────────────────────────────────────────
const NodeIcon = ({ iconKey, size = 24 }) => {
  const found = NODE_ICONS.find((n) => n.value === iconKey);
  if (!found) return <Server size={size} color="#8B5CF6" />;
  const { Icon, color } = found;
  return <Icon size={size} color={color} strokeWidth={2} />;
};

// ── EquipmentCard ─────────────────────────────────────────────────────────────
const EquipmentCard = ({
  equipment,
  deviceStatus,
  statesLoaded,
  getToggle,
  getSlider,
  handleToggle,
  handleSlider,
  canSendCommand,
}) => {
  const mac      = normalizeStatusKey(equipment.mac);
  const liveKey  = getEquipmentStatusKeys(equipment).find((key) => key in deviceStatus);
  const isOnline = liveKey
    ? deviceStatus[liveKey]
    : (typeof equipment.isOnline === 'boolean'
      ? equipment.isOnline
      : String(equipment.status || '').toLowerCase() === 'online');

  const actuators  = Array.isArray(equipment.actuators) ? equipment.actuators : [];
  const hasSensors = Array.isArray(equipment.sensors) && equipment.sensors.length > 0;

  const grouped = actuators.reduce((acc, a) => {
    const key = a?.sensorType || 'general';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <View style={styles.controlCard}>

      {/* En-tête */}
      <View style={styles.controlHeader}>
        <View style={styles.controlTitle}>
          <View style={styles.controlIconBox}>
            <NodeIcon iconKey={equipment.icon} size={24} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.deviceName}>{equipment.name}</Text>
            <Text style={styles.deviceNodeId}>{mac}</Text>
          </View>
        </View>
      </View>

      {/* Statut */}
      <View style={styles.statusRow}>
        <View style={[styles.led, isOnline ? styles.ledOn : styles.ledOff]} />
        <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#6B7280' }]}>
          {isOnline ? 'Active' : 'Inactive'}
        </Text>
        {!statesLoaded && (
          <Text style={styles.syncingLabel}>synchronisation…</Text>
        )}
      </View>

      {/* Actuateurs */}
      {actuators.length > 0 ? (
        <View style={styles.actuatorSection}>
          {Object.entries(grouped).map(([sensorType, sensorActuators]) => {
            const sensorMeta = SENSOR_TYPES.find((s) => s.value === sensorType);
            const SI = sensorMeta?.Icon;
            const SC = sensorMeta?.color;

            return (
              <View key={sensorType} style={styles.actuatorGroup}>
                <View style={styles.actuatorGroupHeader}>
                  {SI && <SI size={13} color={SC} strokeWidth={2} />}
                  <Text style={styles.actuatorGroupLabel}>
                    {sensorType === 'general' ? 'ACTIONNEURS' : sensorType.toUpperCase()}
                  </Text>
                </View>

                {sensorActuators.map((actuator) => {
                  const catalog = SENSOR_ACTUATOR_DEFAULTS[sensorType] ?? SENSOR_ACTUATOR_DEFAULTS['general'];
                  const meta    = catalog?.find((a) => a.type === actuator.type);
                  const { IconComp, iconColor, label } = meta || {};
                  const displayLabel = label || actuator.type.replace(/_/g, ' ');
                  const ctrlType     = actuator.controlType || meta?.controlType || 'toggle';

                  // actuator enrichi avec sensorType pour la payload BackApp
                  const actWithCtrl = { ...actuator, controlType: ctrlType, sensorType };

                  // ── LED strip ──────────────────────────────────────────
                  if (actuator.type === 'led_strip') {
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
                          disabled={!canSendCommand}
                        />
                      </View>
                    );
                  }

                  // ── Toggle ─────────────────────────────────────────────
                  if (ctrlType === 'toggle') {
                    const on = getToggle(equipment.mac, actuator.type);
                    return (
                      <View key={`${sensorType}__${actuator.type}`} style={styles.actuatorRow}>
                        <View style={styles.actuatorRowLeft}>
                          {IconComp && <IconComp size={16} color={iconColor} strokeWidth={2} />}
                          <Text style={styles.actuatorLabel}>{displayLabel}</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => {
                            console.log('[Chef Control] Bouton toggle pressé —', actuator.type, 'canSend:', canSendCommand);
                            handleToggle(equipment, actWithCtrl);
                          }}
                          style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                          activeOpacity={0.8}
                        >
                          <Text style={[styles.toggleBtnText, on && styles.toggleBtnTextOn]}>
                            {on ? 'ON' : 'OFF'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  // ── Slider générique ───────────────────────────────────
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
                          disabled={!canSendCommand}
                        />
                      </View>
                    );
                  }

                  // ── Tone ───────────────────────────────────────────────
                  if (ctrlType === 'tone') {
                    const on = getToggle(equipment.mac, actuator.type);
                    return (
                      <View key={`${sensorType}__${actuator.type}`} style={styles.actuatorRow}>
                        <View style={styles.actuatorRowLeft}>
                          {IconComp && <IconComp size={16} color={iconColor} strokeWidth={2} />}
                          <Text style={styles.actuatorLabel}>{displayLabel}</Text>
                          <Text style={styles.toneBadgeInline}>♪ {actuator.frequency ?? 1000} Hz</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleToggle(equipment, actWithCtrl)}
                          style={[styles.toggleBtn, on && styles.toggleBtnOn]}
                          activeOpacity={0.8}
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
      ) : hasSensors ? (
        <Text style={styles.noSensorsText}>Capteurs : {equipment.sensors?.join(', ')}</Text>
      ) : (
        <Text style={styles.noSensorsText}>Aucun actuateur configuré</Text>
      )}
    </View>
  );
};

// ── ChefControlPage ───────────────────────────────────────────────────────────
const ChefControlPage = ({ userData }) => {
  const isChef = userData?.functionalGrade?.toLowerCase() === 'chef';
  const userFloor = userData?.floor;
  const userRoom  = userData?.officeRoom;

  const primaryRoomId =
    userData?.roomId ??
    userData?.officeRoom ??
    userData?._id ??
    null;

  useEffect(() => {
    console.log('[Chef Control] ═══ userData reçu ═══');
    console.log('[Chef Control] userData:', JSON.stringify(userData, null, 2));
    console.log('[Chef Control] isChef:', isChef, '(functionalGrade =', userData?.functionalGrade, ')');
    console.log('[Chef Control] primaryRoomId:', primaryRoomId);
    if (!isChef)        console.warn('[Chef Control] ⚠️  isChef=false → boutons désactivés');
    if (!primaryRoomId) console.warn('[Chef Control] ⚠️  primaryRoomId=null → validation BackApp échoue');
  }, []);

  const allAccess = [
    ...(userData?.floor && userData?.officeRoom
      ? [{ floor: userData.floor, officeRoom: userData.officeRoom }]
      : []),
    ...(userData?.additionalAccess || []),
  ];

  const [equipmentList, setEquipmentList] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);

  // ── Chef : auth socket spécifique ─────────────────────────────────────────
  const buildSocketAuth = useCallback((u) => ({
    token:            u?.token ?? '',
    roomId:           primaryRoomId,
    functionalGrade:  u?.functionalGrade,
    officeRoom:       u?.officeRoom,
    floor:            u?.floor,
    additionalAccess: u?.additionalAccess,
  }), [primaryRoomId]);

  // ── Chef : roomId = celui de l'équipement, ou le primaryRoomId du chef ───
  const getCommandRoomId = useCallback((equipment) =>
    equipment.roomId ?? equipment.officeRoom ?? primaryRoomId,
  [primaryRoomId]);

  const {
    getToggle, getSlider, handleToggle, handleSlider,
  requestActuatorStates,
  connected, connectedRef, statesLoaded, deviceStatus, lastEvent, diagLog,
  syncDeviceStatusSnapshot,
  equipmentRef,
  } = useActuatorSync({
    userData,
    canSendCommand:  isChef,
    buildSocketAuth,
    getCommandRoomId,
  });

  // Synchroniser la ref quand la liste change
  useEffect(() => { equipmentRef.current = equipmentList; }, [equipmentList, equipmentRef]);

  // Fetch équipements filtrés par la (les) salle(s) du chef
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const [res, liveStatuses] = await Promise.all([
          getEquipments(),
          getLiveDeviceStatuses(),
        ]);
        const list = res?.data || res;
        const all  = Array.isArray(list) ? list : [];

        console.log('[Chef Control] Équipements chargés (total):', all.length);

        const filtered = all.filter((eq) =>
          allAccess.some(
            (acc) =>
              acc?.floor &&
              acc?.officeRoom &&
              eq.floor?.trim().toLowerCase()      === acc.floor.trim().toLowerCase() &&
              eq.officeRoom?.trim().toLowerCase() === acc.officeRoom.trim().toLowerCase(),
          ),
        );

        console.log('[Chef Control] Équipements filtrés:', filtered.length);

        // FIX : on remplit equipmentRef AVANT d'appeler requestActuatorStates
        equipmentRef.current = filtered;
        setEquipmentList(filtered);
        syncDeviceStatusSnapshot(filtered, liveStatuses);

        if (connectedRef.current) {
          requestActuatorStates(filtered);
        } else {
          console.log('[Chef Control] Socket pas encore connecté — requestStates sera émis au connect');
        }
      } catch (err) {
        console.error('[Chef Control] fetchEquipments error:', err);
        setError('Failed to load equipments.');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRoom, userFloor]);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color="#8B5CF6" size="large" />
      <Text style={styles.stateText}>Chargement des équipements…</Text>
    </View>
  );

  if (error) return (
    <View style={styles.centered}>
      <ServerCrash size={40} color="#EF4444" strokeWidth={1.5} />
      <Text style={[styles.stateText, { color: '#EF4444', fontWeight: '600' }]}>{error}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>IoT Control</Text>
            <Text style={styles.subtitle}>
              {userRoom ? `${userFloor ? `${userFloor}  ·  ` : ''}${userRoom}` : 'Tous les équipements'}
            </Text>
          </View>
          <View style={[styles.accessBadge, isChef ? styles.badgeChef : styles.badgeViewer]}>
            {isChef
              ? <ShieldCheck size={14} color="#10B981" strokeWidth={2} />
              : <Eye         size={14} color="#F59E0B" strokeWidth={2} />}
            <Text style={[styles.badgeText, { color: isChef ? '#10B981' : '#F59E0B' }]}>
              {isChef ? 'Chef' : 'Lecture seule'}
            </Text>
          </View>
        </View>

      

        {/* Socket offline banner */}
        {!connected && (
          <View style={styles.offlineBanner}>
            <WifiOff size={14} color="#fbbf24" />
            <Text style={styles.offlineBannerText}>Socket déconnecté</Text>
          </View>
        )}

        {/* Banner synchronisation */}
        {connected && !statesLoaded && equipmentList.length > 0 && (
          <View style={styles.syncBanner}>
            <ActivityIndicator size="small" color="#818CF8" style={{ marginRight: 8 }} />
            <Text style={styles.syncBannerText}>Synchronisation des états actuateurs…</Text>
          </View>
        )}

        {/* Grille équipements */}
        <View style={styles.controlGrid}>
          {equipmentList.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}><Server size={40} color="#8B5CF6" /></View>
              <Text style={styles.emptyTitle}>Aucun équipement</Text>
              <Text style={styles.emptyText}>
                Aucun équipement pour {userRoom ? `"${userRoom}"` : 'votre espace'}.
                {'\n'}allAccess: {JSON.stringify(allAccess)}
              </Text>
            </View>
          ) : (
            equipmentList.map((equipment) => (
              <EquipmentCard
                key={equipment._id || equipment.id}
                equipment={equipment}
                deviceStatus={deviceStatus}
                statesLoaded={statesLoaded}
                getToggle={getToggle}
                getSlider={getSlider}
                handleToggle={handleToggle}
                handleSlider={handleSlider}
                canSendCommand={isChef}
              />
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent:{ paddingBottom: 40 },
  centered:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  stateText:    { fontSize: 14, color: '#6B7280' },
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 24, paddingTop: 24 },
  title:        { fontSize: 28, fontWeight: '700', color: '#111827', marginBottom: 4 },
  subtitle:     { fontSize: 14, color: '#6B7280' },
  accessBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  badgeChef:    { backgroundColor: '#F0FDF4', borderColor: '#10B981' },
  badgeViewer:  { backgroundColor: '#FFFBEB', borderColor: '#F59E0B' },
  badgeText:    { fontSize: 12, fontWeight: '600' },
  offlineBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 24, marginBottom: 8, padding: 10, backgroundColor: '#451a03', borderRadius: 8, borderWidth: 1, borderColor: '#92400e' },
  offlineBannerText: { fontSize: 12, color: '#fbbf24', flex: 1 },
  syncBanner:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 8, padding: 10, backgroundColor: '#1e1b4b', borderRadius: 8, borderWidth: 1, borderColor: '#4338ca' },
  syncBannerText:    { fontSize: 12, color: '#818CF8', flex: 1 },
  syncingLabel:      { fontSize: 11, color: '#818CF8', marginLeft: 8, fontStyle: 'italic' },
  controlGrid:  { paddingHorizontal: 24 },
  emptyState:   { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderRadius: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  emptyIcon:    { width: 80, height: 80, backgroundColor: 'rgba(139,92,246,0.08)', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:   { fontSize: 18, fontWeight: '600', color: '#111827', marginBottom: 8 },
  emptyText:    { fontSize: 12, color: '#6B7280', textAlign: 'center', paddingHorizontal: 20 },
  controlCard:  { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOpacity: 0.07, shadowOffset: { width: 0, height: 3 }, shadowRadius: 10, elevation: 3, marginBottom: 16 },
  controlHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  controlTitle:   { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  controlIconBox: { width: 48, height: 48, backgroundColor: '#F3F4F6', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  deviceName:     { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  deviceNodeId:   { fontSize: 11, color: '#6B7280', fontFamily: 'Courier New' },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 16 },
  led:        { width: 10, height: 10, borderRadius: 5 },
  ledOn:      { backgroundColor: '#10B981' },
  ledOff:     { backgroundColor: '#D1D5DB' },
  statusText: { fontSize: 13, fontWeight: '500' },
  sliderLabel:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sliderValue:  { fontSize: 13, fontWeight: '700' },
  slider:       { width: '100%', height: 36 },
  noSensorsText:       { fontSize: 12, color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' },
  actuatorSection:     { marginTop: 4, gap: 14 },
  actuatorGroup:       { borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 10 },
  actuatorGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  actuatorGroupLabel:  { fontSize: 11, fontWeight: '700', color: '#6B7280', letterSpacing: 0.7 },
  actuatorRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
  actuatorRowLeft:     { flexDirection: 'row', alignItems: 'center', gap: 7 },
  actuatorLabel:       { fontSize: 13, fontWeight: '600', color: '#111827', textTransform: 'capitalize' },
  toneBadgeInline:     { fontSize: 11, color: '#F59E0B', marginLeft: 4 },
  toggleBtn:           { paddingHorizontal: 16, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: 'transparent' },
  toggleBtnOn:         { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  toggleBtnText:       { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  toggleBtnTextOn:     { color: '#fff' },
  actuatorSliderBlock: { backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 8, marginBottom: 6 },
});

export default ChefControlPage;
