
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { io } from "socket.io-client";
import {
  Zap,
  Thermometer,
  Briefcase,
  AlertTriangle
} from "lucide-react-native";
const socket = io("http://172.28.40.165:5000");
const DashboardPage  = ({ userData }) => {
 const [stats, setStats] = useState({
  energy: { value: 0, unit: 'kWh', change: 0, trend: 'up' },
  temperature: { value: 0, unit: '°C', status: '--' },
  activeStations: { current: 0, total: 0, percentage: 0 },
  alerts: { count: 0, change: 0, trend: 'up' },
});

  const [chartPeriod, setChartPeriod] = useState('week');
   const [chartData, setChartData] = useState([]);
  
  const [iotDistribution, setIotDistribution] = useState({
    lights: 0,
    ac: 0,
    others: 0,
    total: 0,
  });

  useEffect(() => {
  socket.on("dashboard-update", data => {
    setStats(data.stats);
    setChartData(data.chartData);
    setIotDistribution(data.iotDistribution);
  });

  return () => socket.off("dashboard-update");
}, []);

  const handlePeriodChange = (period) => {
    setChartPeriod(period);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Dashboard</Text>
        <Text style={styles.pageSubtitle}>Overview of your system</Text>
      </View>

      {/* Dashboard Grid - Stats Cards */}
      <View style={styles.dashboardGrid}>
        {/* Energy Card */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.statCardBorder}
          />
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderText}>Energy Consumption</Text>
            <View style={[styles.statIcon, styles.statIconPrimary]}>
              <Zap size={20} color="#8B5CF6" />

            </View>
          </View>
          <Text style={styles.statValue}>
            {stats.energy.value.toLocaleString()} {stats.energy.unit}
          </Text>
          <View style={styles.statChange}>
            <Text style={[styles.statChangeText, { color: '#10B981' }]}>
              ↓ {stats.energy.change}%
            </Text>
            <Text style={styles.statChangeLabel}>vs last month</Text>
          </View>
        </View>

        {/* Temperature Card */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.statCardBorder}
          />
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderText}>Average Temperature</Text>
            <View style={[styles.statIcon, styles.statIconDanger]}>
              <Thermometer size={20} color="#EF4444" />
            </View>
          </View>
          <Text style={styles.statValue}>
            {stats.temperature.value}{stats.temperature.unit}
          </Text>
          <View style={styles.statChange}>
            <Text style={styles.statChangeLabel}>{stats.temperature.status}</Text>
          </View>
        </View>

        {/* Active Stations Card */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.statCardBorder}
          />
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderText}>Active Positions</Text>
            <View style={[styles.statIcon, styles.statIconSuccess]}>
              <Briefcase size={20} color="#10B981" />
            </View>
          </View>
          <Text style={styles.statValue}>
            {stats.activeStations.current}/{stats.activeStations.total}
          </Text>
          <View style={styles.statChange}>
            <Text style={styles.statChangeLabel}>
              {stats.activeStations.percentage}% of occupation
            </Text>
          </View>
        </View>

        {/* Alerts Card */}
        <View style={styles.statCard}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.statCardBorder}
          />
          <View style={styles.statHeader}>
            <Text style={styles.statHeaderText}>Active Alerts</Text>
            <View style={[styles.statIcon, styles.statIconWarning]}>
              <AlertTriangle size={20} color="#F59E0B" />
            </View>
          </View>
          <Text style={styles.statValue}>{stats.alerts.count}</Text>
          <View style={styles.statChange}>
            <Text style={[styles.statChangeText, { color: '#EF4444' }]}>
              +{stats.alerts.change}
            </Text>
            <Text style={styles.statChangeLabel}>Today</Text>
          </View>
        </View>
      </View>

      {/* Charts Section */}
      <View style={styles.chartsSection}>
        {/* Energy Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Energy Consumption</Text>
            <View style={styles.chartFilters}>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  chartPeriod === 'day' && styles.filterBtnActive,
                ]}
                onPress={() => handlePeriodChange('day')}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    chartPeriod === 'day' && styles.filterBtnTextActive,
                  ]}
                >
                  Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  chartPeriod === 'week' && styles.filterBtnActive,
                ]}
                onPress={() => handlePeriodChange('week')}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    chartPeriod === 'week' && styles.filterBtnTextActive,
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterBtn,
                  chartPeriod === 'month' && styles.filterBtnActive,
                ]}
                onPress={() => handlePeriodChange('month')}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    chartPeriod === 'month' && styles.filterBtnTextActive,
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.chartPlaceholder}>
           <View style={styles.chartBars}>
  {chartData.map((item, index) => (
    <View key={index} style={styles.chartBar}>
      <LinearGradient
        colors={['#8B5CF6', '#EC4899']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={[
          styles.chartBarGradient,
          { height: `${item.percentage}%` },
        ]}
      />
    </View>
  ))}
</View>

          </View>
        </View>

        {/* IoT Distribution Chart */}
        <View style={styles.chartCardSmall}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>IoT Distribution</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            <View style={styles.donutChart}>
              <Text style={styles.donutValue}>{iotDistribution.total}</Text>
              <Text style={styles.donutLabel}>Modules</Text>
            </View>
          </View>
          <View style={styles.energyStats}>
            <View style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>Lights</Text>
              <Text style={[styles.energyStatValue, styles.energyStatValuePrimary]}>
                {iotDistribution.lights}%
              </Text>
            </View>
            <View style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>Air Conditioning</Text>
              <Text style={[styles.energyStatValue, styles.energyStatValueSuccess]}>
                {iotDistribution.ac}%
              </Text>
            </View>
            <View style={styles.energyStat}>
              <Text style={styles.energyStatLabel}>Others</Text>
              <Text style={[styles.energyStatValue, styles.energyStatValueWarning]}>
                {iotDistribution.others}%
              </Text>
            </View>
          </View>
        </View>
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
  dashboardGrid: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#f65cf1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  statCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 4,
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statHeaderText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconPrimary: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  statIconDanger: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statIconSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statIconWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  iconText: {
    fontSize: 20,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  statChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChangeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statChangeLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  chartsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 16,
    shadowColor: '#f65cf1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  chartCardSmall: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 16,
    shadowColor: '#f65cf1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  chartHeader: {
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  chartFilters: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  filterBtnActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  filterBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  chartPlaceholder: {
    height: 280,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '100%',
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  chartBar: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#8B5CF6',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  donutChart: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 40,
    borderColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  donutValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  donutLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  energyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  energyStat: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 16,
    backgroundColor: '#F8F7FC',
    borderRadius: 12,
    marginHorizontal: 4,
  },
  energyStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  energyStatValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  energyStatValuePrimary: {
    color: '#8B5CF6',
  },
  energyStatValueSuccess: {
    color: '#10B981',
  },
  energyStatValueWarning: {
    color: '#F59E0B',
  },
});

export default DashboardPage;