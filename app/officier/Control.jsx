// ControlPage.jsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { 
  Lightbulb, 
  Blinds, 
  AirVent, 
  MonitorCheck,
  Zap,
  Clock,
  Thermometer
} from 'lucide-react-native';

const ControlPage = ({ userData }) => {
  const [devices, setDevices] = useState([
    {
      id: 1,
      name: 'Lighting',
      icon: 'lightbulb',
      status: true,
      value: 75,
      type: 'slider',
      color: '#F59E0B',
    },
    {
      id: 2,
      name: 'Blinds',
      icon: 'blinds',
      status: true,
      value: 60,
      type: 'slider',
      color: '#8B5CF6',
    },
    {
      id: 3,
      name: 'Air Conditioning',
      icon: 'airvent',
      status: true,
      value: 22,
      type: 'temperature',
      color: '#10B981',
    },
    {
      id: 4,
      name: 'Station A-12',
      icon: 'monitor',
      status: true,
      value: null,
      type: 'info',
      color: '#EC4899',
      info: { energy: '145W', duration: '4h 23m', temp: '23°C' },
    },
  ]);

  const toggleDevice = (id) => {
    setDevices(
      devices.map((device) =>
        device.id === id ? { ...device, status: !device.status } : device
      )
    );
  };

  const updateValue = (id, value) => {
    setDevices(
      devices.map((device) =>
        device.id === id ? { ...device, value: parseInt(value) } : device
      )
    );
  };

  const getDeviceIcon = (iconName, color) => {
    const iconProps = {
      size: 24,
      color: color,
      strokeWidth: 2,
    };

    switch (iconName) {
      case 'lightbulb':
        return <Lightbulb {...iconProps} />;
      case 'blinds':
        return <Blinds {...iconProps} />;
      case 'airvent':
        return <AirVent {...iconProps} />;
      case 'monitor':
        return <MonitorCheck {...iconProps} />;
      default:
        return <Lightbulb {...iconProps} />;
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>IoT Control</Text>
        <Text style={styles.pageSubtitle}>Manage your smart modules</Text>
      </View>

      <View style={styles.controlGrid}>
        {devices.map((device) => (
          <View key={device.id} style={styles.controlCard}>
            <View style={styles.controlHeader}>
              <View style={styles.controlTitle}>
                <View
                  style={[
                    styles.deviceIcon,
                    { backgroundColor: `${device.color}15` },
                  ]}
                >
                  {getDeviceIcon(device.icon, device.color)}
                </View>
                <View>
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <View style={styles.statusLed}>
                    <View
                      style={[
                        styles.led,
                        device.status ? styles.ledOn : styles.ledOff,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: device.status ? '#10B981' : '#6B7280' },
                      ]}
                    >
                      {device.status ? 'Activé' : 'Désactivé'}
                    </Text>
                  </View>
                </View>
              </View>
              <Switch
                value={device.status}
                onValueChange={() => toggleDevice(device.id)}
                trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
                thumbColor={device.status ? '#FFFFFF' : '#FFFFFF'}
              />
            </View>

            {device.type === 'slider' && (
              <View style={styles.sliderControl}>
                <View style={styles.sliderLabel}>
                  <Text style={styles.sliderLabelText}>Intensity</Text>
                  <Text style={styles.sliderValue}>{device.value}%</Text>
                </View>
                {/* Progress bar */}
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        width: `${device.value}%`,
                        backgroundColor: device.color 
                      }
                    ]} 
                  />
                </View>
              </View>
            )}

            {device.type === 'temperature' && (
              <View style={styles.tempDisplay}>
                <Thermometer size={32} color={device.color} strokeWidth={2} />
                <Text style={styles.tempValue}>{device.value}</Text>
                <Text style={styles.tempUnit}>°C</Text>
              </View>
            )}

            {device.type === 'info' && device.info && (
              <View style={styles.energyStats}>
                <View style={styles.energyStat}>
                  <View style={styles.energyStatIcon}>
                    <Zap size={16} color="#F59E0B" strokeWidth={2} />
                  </View>
                  <Text style={styles.energyStatLabel}>Energy</Text>
                  <Text style={styles.energyStatValue}>{device.info.energy}</Text>
                </View>
                <View style={styles.energyStat}>
                  <View style={styles.energyStatIcon}>
                    <Clock size={16} color="#8B5CF6" strokeWidth={2} />
                  </View>
                  <Text style={styles.energyStatLabel}>Duration</Text>
                  <Text style={styles.energyStatValue}>{device.info.duration}</Text>
                </View>
                <View style={styles.energyStat}>
                  <View style={styles.energyStatIcon}>
                    <Thermometer size={16} color="#10B981" strokeWidth={2} />
                  </View>
                  <Text style={styles.energyStatLabel}>Temp</Text>
                  <Text style={styles.energyStatValue}>{device.info.temp}</Text>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FC',
  },
  pageHeader: {
    marginBottom: 32,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  controlGrid: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  controlCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
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
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  deviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
    gap: 8,
  },
  led: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  ledOn: {
    backgroundColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  ledOff: {
    backgroundColor: '#6B7280',
    opacity: 0.3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sliderControl: {
    marginTop: 20,
  },
  sliderLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  tempDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
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
    justifyContent: 'space-around',
    marginTop: 20,
    gap: 8,
  },
  energyStat: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
  },
  energyStatIcon: {
    marginBottom: 8,
  },
  energyStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  energyStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
});

export default ControlPage;