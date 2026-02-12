import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/company.dart';
import '../services/company_service.dart';
import '../services/api_client.dart';

final companyServiceProvider = Provider<CompanyService>((ref) {
  return CompanyService(ref.read(apiClientProvider));
});

final companyListProvider = FutureProvider.autoDispose<List<Company>>((
  ref,
) async {
  final service = ref.watch(companyServiceProvider);
  return service.getAllCompanies();
});

class CompanySearchNotifier extends Notifier<String> {
  @override
  String build() => '';
  void set(String value) => state = value;
}

final companySearchProvider = NotifierProvider<CompanySearchNotifier, String>(
  () {
    return CompanySearchNotifier();
  },
);

final filteredCompaniesProvider =
    Provider.autoDispose<AsyncValue<List<Company>>>((ref) {
      final companiesAsync = ref.watch(companyListProvider);
      final search = ref.watch(companySearchProvider).toLowerCase();

      return companiesAsync.whenData((companies) {
        if (search.isEmpty) return companies;
        return companies.where((c) {
          return c.name.toLowerCase().contains(search) ||
              c.eligibleDepartments.toLowerCase().contains(search);
        }).toList();
      });
    });
