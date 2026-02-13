import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Slider from '@react-native-community/slider';
import { 
  Lightbulb, 
  Blinds, 
  AirVent, 
  MonitorCheck,
  Zap,
  Clock,
  Thermometer
} from 'lucide-react-native';

const ControlPage = () => {
  
  const [devices, setDevices] = useState({
    light: { enabled: true, value: 75 },
    blinds: { enabled: true, value: 60 },
    ac: { enabled: true, value: 22 },
    workstation: { enabled: true, value: 0 },
  });

  const toggleDevice = (deviceId) => {
    setDevices({
      ...devices,
      [deviceId]: { ...devices[deviceId], enabled: !devices[deviceId].enabled },
    });
  };

  const updateValue = (deviceId, value) => {
    setDevices({
      ...devices,
      [deviceId]: { ...devices[deviceId], value },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>IoT Control</Text>
        <Text style={styles.subtitle}>Manage your smart modules</Text>
      </View>

      {/* Control Grid */}
      <View style={styles.controlGrid}>
        {/* Light Control */}
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={styles.controlTitle}>
              <View style={[styles.icon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
                <Lightbulb color="#F59E0B" size={24} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.deviceName}>Lighting</Text>
                <View style={styles.statusLed}>
                  <View
                    style={[
                      styles.led,
                      devices.light.enabled ? styles.ledOn : styles.ledOff,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: devices.light.enabled ? '#10B981' : '#6B7280' },
                    ]}
                  >
                    {devices.light.enabled ? 'Activé' : 'Désactivé'}
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={devices.light.enabled}
              onValueChange={() => toggleDevice('light')}
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {devices.light.enabled && (
            <View style={styles.sliderControl}>
              <View style={styles.sliderLabel}>
                <Text style={styles.labelText}>Intensity</Text>
                <Text style={styles.sliderValue}>{Math.round(devices.light.value)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={devices.light.value}
                onValueChange={(value) => updateValue('light', value)}
                minimumTrackTintColor="#8B5CF6"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#8B5CF6"
              />
            </View>
          )}
        </View>

        {/* Blinds Control */}
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={styles.controlTitle}>
              <View style={[styles.icon, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <Blinds color="#8B5CF6" size={24} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.deviceName}>Blinds</Text>
                <View style={styles.statusLed}>
                  <View
                    style={[
                      styles.led,
                      devices.blinds.enabled ? styles.ledOn : styles.ledOff,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: devices.blinds.enabled ? '#10B981' : '#6B7280' },
                    ]}
                  >
                    {devices.blinds.enabled ? 'Activé' : 'Désactivé'}
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={devices.blinds.enabled}
              onValueChange={() => toggleDevice('blinds')}
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {devices.blinds.enabled && (
            <View style={styles.sliderControl}>
              <View style={styles.sliderLabel}>
                <Text style={styles.labelText}>Opening</Text>
                <Text style={styles.sliderValue}>{Math.round(devices.blinds.value)}%</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={100}
                value={devices.blinds.value}
                onValueChange={(value) => updateValue('blinds', value)}
                minimumTrackTintColor="#8B5CF6"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#8B5CF6"
              />
            </View>
          )}
        </View>

        {/* AC Control */}
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={styles.controlTitle}>
              <View style={[styles.icon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                <AirVent color="#10B981" size={24} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.deviceName}>Air Conditioning</Text>
                <View style={styles.statusLed}>
                  <View
                    style={[
                      styles.led,
                      devices.ac.enabled ? styles.ledOn : styles.ledOff,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: devices.ac.enabled ? '#10B981' : '#6B7280' },
                    ]}
                  >
                    {devices.ac.enabled ? 'Activé' : 'Désactivé'}
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={devices.ac.enabled}
              onValueChange={() => toggleDevice('ac')}
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {devices.ac.enabled && (
            <View style={styles.sliderControl}>
              <View style={styles.tempDisplay}>
                <Thermometer color="#10B981" size={32} strokeWidth={2} />
                <Text style={styles.tempValue}>{Math.round(devices.ac.value)}</Text>
                <Text style={styles.tempUnit}>°C</Text>
              </View>
              <View style={styles.sliderLabel}>
                <Text style={styles.labelText}>Temperature</Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={16}
                maximumValue={30}
                value={devices.ac.value}
                onValueChange={(value) => updateValue('ac', value)}
                minimumTrackTintColor="#8B5CF6"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#8B5CF6"
              />
            </View>
          )}
        </View>

        {/* Workstation Control */}
        <View style={styles.controlCard}>
          <View style={styles.controlHeader}>
            <View style={styles.controlTitle}>
              <View style={[styles.icon, { backgroundColor: 'rgba(236, 72, 153, 0.1)' }]}>
                <MonitorCheck color="#EC4899" size={24} strokeWidth={2} />
              </View>
              <View>
                <Text style={styles.deviceName}>Station A-12</Text>
                <View style={styles.statusLed}>
                  <View
                    style={[
                      styles.led,
                      devices.workstation.enabled ? styles.ledOn : styles.ledOff,
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: devices.workstation.enabled ? '#10B981' : '#6B7280' },
                    ]}
                  >
                    {devices.workstation.enabled ? 'Occupé' : 'Libre'}
                  </Text>
                </View>
              </View>
            </View>
            <Switch
              value={devices.workstation.enabled}
              onValueChange={() => toggleDevice('workstation')}
              trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
              thumbColor="#FFFFFF"
            />
          </View>
          {devices.workstation.enabled && (
            <View style={styles.energyStats}>
              <View style={styles.energyStat}>
                <View style={styles.energyStatIcon}>
                  <Zap size={16} color="#F59E0B" strokeWidth={2} />
                </View>
                <Text style={styles.energyLabel}>Energy</Text>
                <Text style={styles.energyValue}>145W</Text>
              </View>
              <View style={styles.energyStat}>
                <View style={styles.energyStatIcon}>
                  <Clock size={16} color="#8B5CF6" strokeWidth={2} />
                </View>
                <Text style={styles.energyLabel}>Duration</Text>
                <Text style={styles.energyValue}>4h 23m</Text>
              </View>
              <View style={styles.energyStat}>
                <View style={styles.energyStatIcon}>
                  <Thermometer size={16} color="#10B981" strokeWidth={2} />
                </View>
                <Text style={styles.energyLabel}>Temp</Text>
                <Text style={styles.energyValue}>23°C</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  controlGrid: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  controlCard: {
    flex: 1,
    minWidth: 190,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#EC4899',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  controlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  controlTitle: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 24,
  },
  deviceName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  statusLed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  led: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ledOn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  ledOff: {
    backgroundColor: '#D1D5DB',
    opacity: 0.5,
  },
  statusText: {
    fontSize: 13,
  },
  sliderControl: {
    marginTop: 20,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  tempDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 8,
  },
  tempValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#111827',
  },
  tempUnit: {
    fontSize: 18,
    color: '#6B7280',
  },
  energyStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  energyStat: {
    flex: 1,
    backgroundColor: '#F8F7FC',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  energyStatIcon: {
    marginBottom: 8,
  },
  energyLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  energyValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});

export default ControlPage;