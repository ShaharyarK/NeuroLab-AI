import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/analysis_provider.dart';
import 'results_screen.dart';

class TestAnalysisScreen extends StatefulWidget {
  const TestAnalysisScreen({super.key});

  @override
  State<TestAnalysisScreen> createState() => _TestAnalysisScreenState();
}

class _TestAnalysisScreenState extends State<TestAnalysisScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  String _selectedTestType = 'blood';

  @override
  void initState() {
    super.initState();
    _initializeControllers();
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  void _initializeControllers() {
    _controllers.clear();
    switch (_selectedTestType) {
      case 'blood':
        _controllers['hemoglobin'] = TextEditingController();
        _controllers['wbc'] = TextEditingController();
        _controllers['platelets'] = TextEditingController();
        _controllers['glucose'] = TextEditingController();
        break;
      case 'urine':
        _controllers['ph'] = TextEditingController();
        _controllers['protein'] = TextEditingController();
        _controllers['glucose'] = TextEditingController();
        _controllers['ketones'] = TextEditingController();
        break;
      case 'stool':
        _controllers['color'] = TextEditingController();
        _controllers['consistency'] = TextEditingController();
        _controllers['occult_blood'] = TextEditingController();
        _controllers['parasites'] = TextEditingController();
        break;
    }
  }

  Future<void> _analyzeTestResults() async {
    if (!_formKey.currentState!.validate()) return;

    final testData = {
      'test_type': _selectedTestType,
      'values': Map.fromEntries(
        _controllers.entries.map(
          (e) => MapEntry(e.key, double.parse(e.value.text)),
        ),
      ),
    };

    final success = await context.read<AnalysisProvider>().analyzeTestResults(
          testData,
          context,
        );

    if (success && mounted) {
      Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => const ResultsScreen(),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Test Results Analysis'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Select Test Type',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      SegmentedButton<String>(
                        segments: const [
                          ButtonSegment(
                            value: 'blood',
                            label: Text('Blood'),
                            icon: Icon(Icons.bloodtype),
                          ),
                          ButtonSegment(
                            value: 'urine',
                            label: Text('Urine'),
                            icon: Icon(Icons.water_drop),
                          ),
                          ButtonSegment(
                            value: 'stool',
                            label: Text('Stool'),
                            icon: Icon(Icons.science),
                          ),
                        ],
                        selected: {_selectedTestType},
                        onSelectionChanged: (Set<String> selection) {
                          setState(() {
                            _selectedTestType = selection.first;
                            _initializeControllers();
                          });
                        },
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Enter Test Values',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      ..._controllers.entries.map(
                        (entry) => Padding(
                          padding: const EdgeInsets.only(bottom: 16.0),
                          child: TextFormField(
                            controller: entry.value,
                            decoration: InputDecoration(
                              labelText:
                                  entry.key.replaceAll('_', ' ').toUpperCase(),
                              border: const OutlineInputBorder(),
                            ),
                            keyboardType: TextInputType.number,
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter a value';
                              }
                              if (double.tryParse(value) == null) {
                                return 'Please enter a valid number';
                              }
                              return null;
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Consumer<AnalysisProvider>(
                builder: (context, provider, _) {
                  return ElevatedButton(
                    onPressed: provider.isLoading ? null : _analyzeTestResults,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: provider.isLoading
                        ? const CircularProgressIndicator()
                        : const Text(
                            'Analyze Results',
                            style: TextStyle(fontSize: 16),
                          ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
