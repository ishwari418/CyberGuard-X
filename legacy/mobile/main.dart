import 'package:flutter/material.dart';

void main() {
  runApp(const GuardianShieldApp());
}

class GuardianShieldApp extends StatelessWidget {
  const GuardianShieldApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Guardian Shield',
      theme: ThemeData(
        brightness: Brightness.dark,
        primaryColor: Colors.blue,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        useMaterial3: true,
      ),
      home: const DashboardScreen(),
    );
  }
}

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool isMilitaryMode = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Guardian Shield'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          Switch(
            value: isMilitaryMode,
            onChanged: (val) => setState(() => isMilitaryMode = val),
            activeColor: Colors.green,
            inactiveThumbColor: Colors.blue,
          ),
        ],
      ),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(16),
        children: [
          _buildTile(Icons.shield, 'Phishing Guard', Colors.blue),
          _buildTile(Icons.android, 'App Sentinel', Colors.green),
          _buildTile(Icons.phone_missed, 'Voice Shield', Colors.red),
          _buildTile(Icons.qr_code, 'QR Analyzer', Colors.orange),
          _buildTile(Icons.lock, 'Secure Chat', Colors.purple),
          _buildTile(Icons.map, 'Threat Map', Colors.teal),
        ],
      ),
    );
  }

  Widget _buildTile(IconData icon, String label, Color color) {
    return Card(
      color: const Color(0xFF1E293B),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 48, color: color),
          const SizedBox(height: 16),
          Text(label, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
