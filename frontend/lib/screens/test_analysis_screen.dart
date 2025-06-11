import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_spinkit/flutter_spinkit.dart';
import '../providers/analysis_provider.dart';

class TestAnalysisScreen extends StatefulWidget {
  const TestAnalysisScreen({super.key});

  @override
  State<TestAnalysisScreen> createState() => _TestAnalysisScreenState();
}

class _TestAnalysisScreenState extends State<TestAnalysisScreen> {
  final _formKey = GlobalKey<FormState>();
  final Map<String, TextEditingController> _controllers = {};
  bool _isAnalyzing = false;

  final List<String> _testCategories = [
    'Blood Tests',
    'Urine Tests',
    'Stool Tests',
  ];

  final Map<String, List<String>> _testTypes = {
    'Blood Tests': [
      'Hemoglobin',
      'White Blood Cells',
      'Platelets',
      'Glucose',
      'Cholesterol',
    ],
    'Urine Tests': [
      'pH',
      'Specific Gravity',
      'Protein',
      'Glucose',
      'Ketones',
    ],
    'Stool Tests': [
      'Color',
      'Consistency',
      'Occult Blood',
      'pH',
      'Fat Content',
    ],
  };

  @override
  void initState() {
    super.initState();
    for (final category in _testCategories) {
      for (final test in _testTypes[category]!) {
        _controllers[test] = TextEditingController();
      }
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _analyzeResults() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isAnalyzing = true);

    try {
      final testData = <String, double>{};
      for (final entry in _controllers.entries) {
        testData[entry.key] = double.parse(entry.value.text);
      }

      final result = await context.read<AnalysisProvider>().analyzeTestResults(
            testData,
          );

      if (!mounted) return;

      if (result != null) {
        // TODO: Navigate to results screen
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Analysis completed successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error analyzing results: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isAnalyzing = false);
      }
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
              // Test Categories
              ..._testCategories.map((category) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 16),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          category,
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const SizedBox(height: 16),
                        ..._testTypes[category]!.map((test) {
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 16),
                            child: TextFormField(
                              controller: _controllers[test],
                              decoration: InputDecoration(
                                labelText: test,
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
                          );
                        }).toList(),
                      ],
                    ),
                  ),
                );
              }).toList(),

              // Analysis Button
              ElevatedButton.icon(
                onPressed: _isAnalyzing ? null : _analyzeResults,
                icon: _isAnalyzing
                    ? const SpinKitThreeBounce(
                        color: Colors.white,
                        size: 24,
                      )
                    : const Icon(Icons.analytics),
                label: Text(_isAnalyzing ? 'Analyzing...' : 'Analyze Results'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.all(16),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
