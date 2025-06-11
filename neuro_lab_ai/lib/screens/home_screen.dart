import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:neuro_lab_ai/providers/auth_provider.dart';
import 'package:neuro_lab_ai/providers/analysis_provider.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  Future<void> _pickAndAnalyzeImage(BuildContext context, String type) async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
      );

      if (result != null && result.files.isNotEmpty) {
        final file = result.files.first;
        if (file.path != null) {
          final analysisProvider = context.read<AnalysisProvider>();
          final result = await analysisProvider.analyzeImage(
            File(file.path!),
            type,
          );

          if (context.mounted) {
            showDialog(
              context: context,
              builder: (context) => AlertDialog(
                title: const Text('Analysis Result'),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Result: ${result['result']}'),
                    const SizedBox(height: 8),
                    Text(
                        'Confidence: ${(result['confidence'] * 100).toStringAsFixed(2)}%'),
                  ],
                ),
                actions: [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ],
              ),
            );
          }
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('NeuroLab AI'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () {
              context.read<AuthProvider>().logout();
            },
          ),
        ],
      ),
      body: Consumer<AnalysisProvider>(
        builder: (context, analysisProvider, _) {
          return GridView.count(
            padding: const EdgeInsets.all(16),
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            children: [
              _AnalysisCard(
                title: 'X-Ray Analysis',
                icon: Icons.radiology,
                onTap: () => _pickAndAnalyzeImage(context, 'xray'),
                isLoading: analysisProvider.isAnalyzing,
              ),
              _AnalysisCard(
                title: 'MRI Analysis',
                icon: Icons.mri,
                onTap: () => _pickAndAnalyzeImage(context, 'mri'),
                isLoading: analysisProvider.isAnalyzing,
              ),
              _AnalysisCard(
                title: 'CT Scan Analysis',
                icon: Icons.medical_services,
                onTap: () => _pickAndAnalyzeImage(context, 'ct'),
                isLoading: analysisProvider.isAnalyzing,
              ),
              _AnalysisCard(
                title: 'Test Results',
                icon: Icons.science,
                onTap: () {
                  // TODO: Implement test results analysis
                },
                isLoading: analysisProvider.isAnalyzing,
              ),
            ],
          );
        },
      ),
    );
  }
}

class _AnalysisCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback onTap;
  final bool isLoading;

  const _AnalysisCard({
    required this.title,
    required this.icon,
    required this.onTap,
    required this.isLoading,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: isLoading ? null : onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 48,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(height: 16),
              Text(
                title,
                style: Theme.of(context).textTheme.titleLarge,
                textAlign: TextAlign.center,
              ),
              if (isLoading) ...[
                const SizedBox(height: 16),
                const CircularProgressIndicator(),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
