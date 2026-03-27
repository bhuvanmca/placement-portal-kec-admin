import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Tracks whether the backend server is reachable.
/// true = Server is UP (or unknown)
/// false = Server is DOWN
final serverStatusProvider = NotifierProvider<ServerStatusNotifier, bool>(
  ServerStatusNotifier.new,
);

class ServerStatusNotifier extends Notifier<bool> {
  @override
  bool build() => true;

  void setStatus(bool status) {
    state = status;
  }
}
