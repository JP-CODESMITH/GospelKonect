import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class RegistrationScreen extends StatelessWidget {
  const RegistrationScreen({super.key});

  void _createAccount(BuildContext context) =>
      Navigator.of(context).pushNamedAndRemoveUntil('/home', (_) => false);

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Create Account')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Join GospelKonect',
                style: textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Create your account to get started',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppColors.neutralMuted,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
              const TextField(
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(hintText: 'Full name'),
              ),
              const SizedBox(height: 16),
              const TextField(
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                decoration: InputDecoration(hintText: 'Email'),
              ),
              const SizedBox(height: 16),
              TextField(
                obscureText: true,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(hintText: 'Password'),
                onSubmitted: (_) => _createAccount(context),
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () => _createAccount(context),
                  child: const Text('Create Account'),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    'Already have an account?',
                    style: textTheme.bodyMedium,
                  ),
                  TextButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Sign In'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
