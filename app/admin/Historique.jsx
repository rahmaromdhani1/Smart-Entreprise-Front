import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DollarSign, Clock, CheckCircle } from 'lucide-react-native';

const ReportsPage = () => {
  const [stats, setStats] = useState([
  { title: 'Savings Achieved', value: '--', change: '--', changeText: '', icon: DollarSign , iconBg: 'rgba(16,185,129,0.1)', iconColor: '#10B981' },
  { title: 'Operating Time', value: '--', change: '--', changeText: '', icon: Clock, iconBg: 'rgba(139,92,246,0.1)', iconColor: '#8B5CF6' },
  { title: 'Alerts Resolved', value: '--', change: '--', changeText: '', icon: CheckCircle, iconBg: 'rgba(245,158,11,0.1)', iconColor: '#F59E0B' }
]);
const iconMap = {
  savings: DollarSign,
  time: Clock,
  alerts: CheckCircle,
};

const [chartData, setChartData] = useState([0, 0, 0, 0, 0, 0]);

useEffect(() => {
  fetch('http://172.28.40.165:5000/api/reports')  // Remplace par ton IP ou localhost correct
    .then(res => res.json())
    .then(data => {
      if (data.stats) setStats(data.stats);
      if (data.chartData) setChartData(data.chartData);
    })
    .catch(err => console.error('Fetch error:', err));
}, []);


  return (
    
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>History & Reports</Text>
        <Text style={styles.subtitle}>Analyze your system data</Text>
      </View>

      {/* Chart Card */}
      
      <View style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <Text style={styles.chartTitle}>Monthly Energy Consumption</Text>
          <View style={styles.chartFilters}>
            <Text style={styles.filterBtn}>3 Months</Text>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.filterBtnActive}
            >
              <Text style={styles.filterBtnActiveText}>6 Months</Text>
            </LinearGradient>
            <Text style={styles.filterBtn}>1 Year</Text>
          </View>
        </View>
        <View style={styles.chartPlaceholder}>
          <View style={styles.chartBars}>
            {[70, 65, 80, 75, 60, 55].map((height, index) => (
              <LinearGradient
                key={index}
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.chartBar, { height: `${height}%` }]}
              />
            ))}
          </View>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        
        {stats.map((stat, index) => {
  const IconComponent = iconMap[stat.icon] || DollarSign;

  return (
    <View key={index} style={styles.statCard}>
      <View style={styles.statHeader}>
        
        <Text style={styles.statTitle}>{stat.title}</Text>

        <View
          style={[
            styles.statIcon,
            { backgroundColor: stat.iconBg },
          ]}
        >
          <IconComponent
            size={20}
            color={stat.iconColor}
          />
        </View>
      </View>

      <Text style={styles.statValue}>{stat.value}</Text>

      <View style={styles.statChange}>
        <Text style={styles.changeText}>{stat.change}</Text>
        {stat.changeText && (
          <Text style={styles.changeSubtext}>
            {stat.changeText}
          </Text>
        )}
      </View>
    </View>
  );
})}


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

  chartCard: {
    backgroundColor: '#FFFFFF',
    padding: 28,
    borderRadius: 16,
    shadowColor: '#EC4899',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  chartFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 13,
    color: '#6B7280',
  },
  filterBtnActive: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  filterBtnActiveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  chartPlaceholder: {
    height: 280,
    backgroundColor: 'rgba(139, 92, 246, 0.05)',
    borderRadius: 12,
    padding: 20,
    paddingHorizontal: 16,
    
  },
  chartBars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 16,
  },
  chartBar: {
    flex: 1,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  statsGrid: {
  paddingHorizontal: 24,
  marginBottom: 32,
  },
  statCard: {
    overflow: 'hidden',
    flex: 1,
    minWidth: 250,
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statTitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  changeText: {
    fontSize: 13,
    color: '#6B7280',
  },
  changeSubtext: {
    fontSize: 13,
    color: '#6B7280',
  },
});

export default ReportsPage;