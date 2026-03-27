class Formatters {
  static String formatDate(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'N/A';
    try {
      final date = DateTime.parse(dateStr);
      final day = date.day;
      final month = _getMonthName(date.month);
      final year = date.year;
      final suffix = _getOrdinalSuffix(day);

      return '$day$suffix $month $year';
    } catch (e) {
      return dateStr;
    }
  }

  static String formatDateTime(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'N/A';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      final day = date.day;
      final month = _getMonthName(date.month);
      final year = date.year;
      final suffix = _getOrdinalSuffix(day);

      final hour = date.hour > 12
          ? date.hour - 12
          : (date.hour == 0 ? 12 : date.hour);
      final minute = date.minute.toString().padLeft(2, '0');
      final period = date.hour >= 12 ? 'PM' : 'AM';

      return '$day$suffix $month $year, $hour:$minute $period';
    } catch (e) {
      return dateStr;
    }
  }

  /// Clean date without ordinal suffix: "21 Feb 2026"
  static String formatDateOnly(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return 'N/A';
    try {
      final date = DateTime.parse(dateStr).toLocal();
      return '${date.day} ${_getMonthName(date.month)} ${date.year}';
    } catch (e) {
      return dateStr;
    }
  }

  /// Relative time for deadlines: "Today", "Tomorrow", "in 3 days", "2 days ago"
  static String timeUntil(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final target = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final targetDay = DateTime(target.year, target.month, target.day);
      final diff = targetDay.difference(today).inDays;

      if (diff == 0) return 'Today';
      if (diff == 1) return 'Tomorrow';
      if (diff == -1) return 'Yesterday';
      if (diff > 1 && diff <= 30) return 'in $diff days';
      if (diff < -1 && diff >= -30) return '${-diff} days ago';
      // Fallback to date
      return formatDateOnly(dateStr);
    } catch (e) {
      return '';
    }
  }

  static String _getOrdinalSuffix(int day) {
    if (day >= 11 && day <= 13) {
      return 'th';
    }
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  }

  static String _getMonthName(int month) {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    if (month < 1 || month > 12) return '';
    return months[month - 1];
  }
}
