import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  void _signIn(BuildContext context) =>
      Navigator.of(context).pushNamedAndRemoveUntil('/home', (_) => false);

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Sign In')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(16, 32, 16, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Welcome back',
                style: textTheme.headlineLarge,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                'Sign in to continue',
                style: textTheme.bodyMedium?.copyWith(
                  color: AppColors.neutralMuted,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 32),
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
                onSubmitted: (_) => _signIn(context),
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 48,
                child: ElevatedButton(
                  onPressed: () => _signIn(context),
                  child: const Text('Sign In'),
                ),
              ),
              const SizedBox(height: 8),
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    "Don't have an account?",
                    style: textTheme.bodyMedium,
                  ),
                  TextButton(
                    onPressed: () =>
                        Navigator.of(context).pushNamed('/register'),
                    child: const Text('Create Account'),
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
