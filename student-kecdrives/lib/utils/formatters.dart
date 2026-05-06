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

  /// Relative time for deadlines: "Today, 10:00 AM", "Tomorrow, 05:30 PM", "in 3 days"
  static String timeUntil(String? dateStr) {
    if (dateStr == null || dateStr.isEmpty) return '';
    try {
      final target = DateTime.parse(dateStr).toLocal();
      final now = DateTime.now();
      final today = DateTime(now.year, now.month, now.day);
      final targetDay = DateTime(target.year, target.month, target.day);
      final diff = targetDay.difference(today).inDays;

      final hour = target.hour > 12
          ? target.hour - 12
          : (target.hour == 0 ? 12 : target.hour);
      final minute = target.minute.toString().padLeft(2, '0');
      final period = target.hour >= 12 ? 'PM' : 'AM';
      final timeStr = '$hour:$minute $period';

      if (diff == 0) return 'Today, $timeStr';
      if (diff == 1) return 'Tomorrow, $timeStr';
      if (diff == -1) return 'Yesterday, $timeStr';
      if (diff > 1 && diff <= 30) return 'in $diff days, $timeStr';
      if (diff < -1 && diff >= -30) return '${-diff} days ago, $timeStr';
      // Fallback to date with time
      return '${formatDateOnly(dateStr)}, $timeStr';
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
