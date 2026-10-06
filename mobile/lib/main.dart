import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:5000');
const secureStorage = FlutterSecureStorage();

void main() => runApp(const TravelWiseApp());

class ApiClient {
  Future<Map<String, String>> _headers() async {
    final token = await secureStorage.read(key: 'access_token');
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> request(String path, {String method = 'GET', Map<String, dynamic>? body}) async {
    final headers = await _headers();
    final uri = Uri.parse('$apiUrl$path');
    final response = method == 'POST'
        ? await http.post(uri, headers: headers, body: jsonEncode(body ?? {}))
        : await http.get(uri, headers: headers);
    dynamic decoded;
    try {
      decoded = response.body.isEmpty ? null : jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final message = decoded is Map && decoded['error'] != null ? decoded['error'].toString() : 'Request failed (${response.statusCode})';
      throw Exception(message);
    }
    return decoded;
  }
}

class TravelWiseApp extends StatelessWidget {
  const TravelWiseApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'TravelWise',
        theme: ThemeData(colorSchemeSeed: Colors.teal, useMaterial3: true),
        home: const SessionGate(),
      );
}

class SessionGate extends StatefulWidget {
  const SessionGate({super.key});
  @override
  State<SessionGate> createState() => _SessionGateState();
}

class _SessionGateState extends State<SessionGate> {
  bool loading = true;
  bool signedIn = false;

  @override
  void initState() {
    super.initState();
    secureStorage.read(key: 'access_token').then((token) => setState(() {
          signedIn = token != null;
          loading = false;
        }));
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    return signedIn ? HomePage(onSignOut: () => setState(() => signedIn = false)) : LoginPage(onSignedIn: () => setState(() => signedIn = true));
  }
}

class LoginPage extends StatefulWidget {
  const LoginPage({required this.onSignedIn, super.key});
  final VoidCallback onSignedIn;
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final email = TextEditingController();
  final password = TextEditingController();
  bool register = false;
  bool busy = false;
  String? error;

  Future<void> submit() async {
    setState(() { busy = true; error = null; });
    try {
      final response = await ApiClient().request(register ? '/api/auth/register' : '/api/auth/login', method: 'POST', body: {'email': email.text.trim(), 'password': password.text});
      final data = response as Map<String, dynamic>;
      final token = data['access_token']?.toString();
      if (token == null) throw Exception(register ? 'Account created. Confirm your email, then sign in.' : 'No access token returned.');
      await secureStorage.write(key: 'access_token', value: token);
      widget.onSignedIn();
    } catch (e) {
      setState(() => error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
              const Icon(Icons.travel_explore, size: 72, color: Colors.teal),
              const Text('TravelWise', textAlign: TextAlign.center, style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text(register ? 'Create your group travel account' : 'Sign in to your trips', textAlign: TextAlign.center),
              const SizedBox(height: 28),
              TextField(controller: email, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder())),
              const SizedBox(height: 12),
              TextField(controller: password, obscureText: true, decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder())),
              const SizedBox(height: 16),
              FilledButton(onPressed: busy ? null : submit, child: Text(busy ? 'Please wait...' : register ? 'Create account' : 'Sign in')),
              TextButton(onPressed: busy ? null : () => setState(() { register = !register; error = null; }), child: Text(register ? 'Already have an account? Sign in' : 'New user? Create an account')),
              if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
            ]),
          ),
        ),
      );
}

class HomePage extends StatefulWidget {
  const HomePage({required this.onSignOut, super.key});
  final VoidCallback onSignOut;
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final client = ApiClient();
  List<dynamic> trips = [];
  bool loading = true;
  String? error;

  @override
  void initState() { super.initState(); loadTrips(); }

  Future<void> loadTrips() async {
    try {
      final result = await client.request('/api/trips');
      setState(() { trips = result as List<dynamic>; error = null; loading = false; });
    } catch (e) {
      setState(() { error = e.toString().replaceFirst('Exception: ', ''); loading = false; });
    }
  }

  Future<void> createTrip() async {
    final name = TextEditingController();
    final destination = TextEditingController();
    final result = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: const Text('Create trip'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: name, decoration: const InputDecoration(labelText: 'Trip name')),
        TextField(controller: destination, decoration: const InputDecoration(labelText: 'Destination')),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () async {
        try {
          await client.request('/api/trips', method: 'POST', body: {'name': name.text, 'destination': destination.text, 'startDate': DateTime.now().toIso8601String().substring(0, 10), 'endDate': DateTime.now().add(const Duration(days: 4)).toIso8601String().substring(0, 10)});
          if (!mounted) return;
          Navigator.pop(context, true);
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
        }
      }, child: const Text('Create'))],
    ));
    if (result == true) loadTrips();
  }

  Future<void> signOut() async { await secureStorage.delete(key: 'access_token'); widget.onSignOut(); }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('TravelWise'), actions: [IconButton(onPressed: signOut, icon: const Icon(Icons.logout))]),
        floatingActionButton: FloatingActionButton.extended(onPressed: createTrip, icon: const Icon(Icons.add), label: const Text('Trip')),
        body: RefreshIndicator(onRefresh: loadTrips, child: loading
            ? ListView(children: const [SizedBox(height: 300), Center(child: CircularProgressIndicator())])
            : ListView(padding: const EdgeInsets.all(16), children: [
                const Text('Your group trips', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                if (error != null) Padding(padding: const EdgeInsets.symmetric(vertical: 16), child: Text(error!, style: const TextStyle(color: Colors.red))),
                if (trips.isEmpty && error == null) const Padding(padding: EdgeInsets.symmetric(vertical: 32), child: Text('No trips yet. Create your first trip.')),
                ...trips.map((trip) => Card(child: ListTile(
                  leading: const CircleAvatar(child: Icon(Icons.luggage)),
                  title: Text(trip['name']?.toString() ?? 'Trip'),
                  subtitle: Text('${trip['destination'] ?? ''}\n${trip['startDate'] ?? ''} - ${trip['endDate'] ?? ''}'),
                  isThreeLine: true,
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => TripDetailPage(trip: trip as Map<String, dynamic>))),
                ))),
              ])),
      );
}

class TripDetailPage extends StatefulWidget {
  const TripDetailPage({required this.trip, super.key});
  final Map<String, dynamic> trip;
  @override
  State<TripDetailPage> createState() => _TripDetailPageState();
}

class _TripDetailPageState extends State<TripDetailPage> {
  final client = ApiClient();
  int tab = 0;
  List<dynamic> records = [];
  Map<String, dynamic>? settlement;
  Map<String, dynamic>? workflow;
  String? message;

  String get tripId => widget.trip['id'].toString();

  @override
  void initState() { super.initState(); loadTab(); }

  Future<void> loadTab() async {
    try {
      final paths = ['/api/budgets/trip/$tripId', '/api/expenses/trip/$tripId', '/api/activities/trip/$tripId', '/api/risks/trip/$tripId', '/api/groups/$tripId/members'];
      final result = await client.request(paths[tab]);
      setState(() { records = result as List<dynamic>; message = null; });
      if (tab == 4) await loadSettlement();
    } catch (e) { setState(() => message = e.toString().replaceFirst('Exception: ', '')); }
  }

  Future<void> loadSettlement() async {
    try { settlement = (await client.request('/api/settlements/trip/$tripId')) as Map<String, dynamic>; setState(() {}); } catch (_) {}
  }

  Future<void> addRecord() async {
    final title = TextEditingController();
    final amount = TextEditingController();
    final result = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
      title: Text(tab == 0 ? 'Add budget' : tab == 1 ? 'Add expense' : tab == 2 ? 'Add activity' : tab == 3 ? 'Add risk' : 'Add group member'),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        TextField(controller: title, decoration: InputDecoration(labelText: tab == 1 ? 'Description' : tab == 4 ? 'Display name' : 'Name / summary')),
        TextField(controller: amount, keyboardType: TextInputType.number, decoration: InputDecoration(labelText: tab == 4 ? 'Email' : 'Amount')),
      ]),
      actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')), FilledButton(onPressed: () async {
        try {
          final body = tab == 0 ? {'tripId': tripId, 'amount': double.parse(amount.text), 'currency': 'LKR'}
              : tab == 1 ? {'tripId': tripId, 'paidBy': 'Current traveler', 'amount': double.parse(amount.text), 'description': title.text, 'currency': 'LKR'}
              : tab == 2 ? {'tripId': tripId, 'name': title.text, 'location': 'To be confirmed', 'startAt': DateTime.now().toIso8601String(), 'endAt': DateTime.now().add(const Duration(hours: 1)).toIso8601String()}
              : tab == 3 ? {'tripId': tripId, 'severity': 'Medium', 'summary': title.text, 'weatherSummary': null}
              : {'tripId': tripId, 'displayName': title.text, 'email': amount.text};
          final paths = ['/api/budgets', '/api/expenses', '/api/activities', '/api/risks', '/api/groups/members'];
          await client.request(paths[tab], method: 'POST', body: body);
          if (!mounted) return;
          Navigator.pop(context, true);
        } catch (e) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
        }
      }, child: const Text('Save'))],
    ));
    if (result == true) loadTab();
  }

  Future<void> startWorkflow() async {
    try {
      final result = await client.request('/api/workflows', method: 'POST', body: {'tripId': tripId, 'objective': 'Prepare a safe budget, itinerary, risk and settlement recommendation'});
      setState(() => workflow = result as Map<String, dynamic>);
    } catch (e) { setState(() => message = e.toString().replaceFirst('Exception: ', '')); }
  }

  Future<void> approve(bool approved) async {
    if (workflow == null) return;
    try {
      final result = await client.request('/api/workflows/${workflow!['id']}/approval', method: 'POST', body: {'approved': approved, 'comment': approved ? 'Approved in mobile app' : 'Rejected in mobile app'});
      setState(() => workflow = result as Map<String, dynamic>);
    } catch (e) { setState(() => message = e.toString()); }
  }

  Future<void> captureReceipt() async {
    final image = await ImagePicker().pickImage(source: ImageSource.camera);
    if (image == null || !mounted) return;
    try {
      final token = await secureStorage.read(key: 'access_token');
      if (token == null) throw Exception('Please sign in before uploading a receipt.');
      final filename = 'receipts/${DateTime.now().millisecondsSinceEpoch}.jpg';
      final request = http.MultipartRequest('POST', Uri.parse('$apiUrl/api/receipts'));
      request.headers.addAll({'Authorization': 'Bearer $token'});
      request.files.add(await http.MultipartFile.fromPath('file', File(image.path).path, filename: filename.split('/').last));
      final response = await request.send();
      if (response.statusCode < 200 || response.statusCode >= 300) throw Exception('Receipt upload failed (${response.statusCode}).');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Receipt captured and uploaded to Supabase Storage.')));
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))));
    }
  }

  @override
  Widget build(BuildContext context) {
    final labels = ['Budget', 'Expenses', 'Activities', 'Risks', 'Group'];
    return Scaffold(
      appBar: AppBar(title: Text(widget.trip['name']?.toString() ?? 'Trip')),
      floatingActionButton: FloatingActionButton(
        onPressed: tab == 1 ? captureReceipt : addRecord,
        child: Icon(tab == 1 ? Icons.camera_alt : Icons.add),
      ),
      body: Column(
        children: [
          ListTile(
            title: Text(widget.trip['destination']?.toString() ?? ''),
            subtitle: const Text('Travel safety and shared planning workspace'),
            trailing: IconButton(onPressed: startWorkflow, icon: const Icon(Icons.auto_awesome)),
          ),
          if (message != null) Padding(padding: const EdgeInsets.all(8), child: Text(message!, style: const TextStyle(color: Colors.red))),
          if (workflow != null) Card(
            margin: const EdgeInsets.all(8),
            child: ListTile(
              leading: const Icon(Icons.smart_toy),
              title: Text('AI workflow: ${workflow!['status']}'),
              subtitle: Text(workflow!['objective']?.toString() ?? ''),
              trailing: workflow!['status'] == 'AwaitingApproval'
                  ? Wrap(children: [
                      IconButton(onPressed: () => approve(true), icon: const Icon(Icons.check, color: Colors.green)),
                      IconButton(onPressed: () => approve(false), icon: const Icon(Icons.close, color: Colors.red)),
                    ])
                  : null,
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: List.generate(labels.length, (index) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: ChoiceChip(label: Text(labels[index]), selected: tab == index, onSelected: (_) { setState(() => tab = index); loadTab(); }),
              )),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(12),
              children: [
                ...records.map((item) => Card(child: ListTile(
                  title: Text(item['description']?.toString() ?? item['name']?.toString() ?? item['displayName']?.toString() ?? item['summary']?.toString() ?? 'Record'),
                  subtitle: Text(item['amount'] != null ? '${item['amount']} ${item['currency'] ?? 'LKR'}' : item['email']?.toString() ?? item['location']?.toString() ?? item['severity']?.toString() ?? ''),
                ))),
                if (tab == 4 && settlement != null) ...[
                  const Divider(),
                  const Text('Settlement plan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ...(settlement!['transfers'] as List<dynamic>? ?? []).map((transfer) => ListTile(
                    leading: const Icon(Icons.swap_horiz),
                    title: Text('${transfer['fromMember']} pays ${transfer['toMember']}'),
                    trailing: Text('${transfer['amount']} ${transfer['currency']}'),
                  )),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
