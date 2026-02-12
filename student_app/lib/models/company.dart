class CompanyChecklist {
  final bool approved;
  final bool cab;
  final bool accommodation;
  final bool rounds;
  final bool qpPrintout;

  CompanyChecklist({
    this.approved = false,
    this.cab = false,
    this.accommodation = false,
    this.rounds = false,
    this.qpPrintout = false,
  });

  factory CompanyChecklist.fromJson(Map<String, dynamic> json) {
    return CompanyChecklist(
      approved: json['approved'] ?? false,
      cab: json['cab'] ?? false,
      accommodation: json['accommodation'] ?? false,
      rounds: json['rounds'] ?? false,
      qpPrintout: json['qp_printout'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
    'approved': approved,
    'cab': cab,
    'accommodation': accommodation,
    'rounds': rounds,
    'qp_printout': qpPrintout,
  };

  CompanyChecklist copyWith({
    bool? approved,
    bool? cab,
    bool? accommodation,
    bool? rounds,
    bool? qpPrintout,
  }) {
    return CompanyChecklist(
      approved: approved ?? this.approved,
      cab: cab ?? this.cab,
      accommodation: accommodation ?? this.accommodation,
      rounds: rounds ?? this.rounds,
      qpPrintout: qpPrintout ?? this.qpPrintout,
    );
  }
}

class Company {
  final int id;
  final String name;
  final DateTime visitDate;
  final String incharge;
  final String eligibleDepartments;
  final String salary;
  final String eligibility;
  final String remarks;
  final CompanyChecklist checklist;

  Company({
    required this.id,
    required this.name,
    required this.visitDate,
    required this.incharge,
    required this.eligibleDepartments,
    required this.salary,
    required this.eligibility,
    required this.remarks,
    required this.checklist,
  });

  factory Company.fromJson(Map<String, dynamic> json) {
    return Company(
      id: json['id'],
      name: json['name'],
      visitDate: DateTime.parse(json['visit_date']),
      incharge: json['incharge'] ?? '',
      eligibleDepartments: json['eligible_departments'] ?? '',
      salary: json['salary'] ?? '',
      eligibility: json['eligibility'] ?? '',
      remarks: json['remarks'] ?? '',
      checklist: json['checklist'] != null
          ? CompanyChecklist.fromJson(json['checklist'])
          : CompanyChecklist(),
    );
  }
}
