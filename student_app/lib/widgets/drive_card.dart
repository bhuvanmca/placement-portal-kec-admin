import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart';
import '../screens/drive_detail_screen.dart';

class DriveCard extends StatelessWidget {
  final Map<String, dynamic> drive;
  final VoidCallback? onRefresh;

  const DriveCard({super.key, required this.drive, this.onRefresh});

  @override
  Widget build(BuildContext context) {
    final userStatus = drive['user_status'] as String?;
    final isEligible = drive['is_eligible'] == true;

    return GestureDetector(
      onTap: () async {
        await Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => DriveDetailScreen(drive: drive),
          ),
        );
        onRefresh?.call();
      },
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: Colors.grey.shade200, width: 1),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          children: [
            // Main content
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header: Logo + Company + Badge
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Company logo
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: const Color(
                            0xFF002147,
                          ).withValues(alpha: 0.06),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        clipBehavior: Clip.antiAlias,
                        child:
                            drive['logo_url'] != null &&
                                drive['logo_url'].toString().isNotEmpty
                            ? CachedNetworkImage(
                                imageUrl: AppConstants.sanitizeUrl(
                                  drive['logo_url'],
                                ),
                                memCacheHeight: 150,
                                placeholder: (context, url) => Container(
                                  color: const Color(
                                    0xFF002147,
                                  ).withValues(alpha: 0.06),
                                ),
                                errorWidget: (context, url, error) =>
                                    const Icon(
                                      Icons.business_rounded,
                                      color: Color(0xFF002147),
                                      size: 22,
                                    ),
                                fit: BoxFit.cover,
                              )
                            : const Icon(
                                Icons.business_rounded,
                                color: Color(0xFF002147),
                                size: 22,
                              ),
                      ),
                      const SizedBox(width: 12),
                      // Company name + role
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              drive['company_name'] ?? 'Company',
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                                fontSize: 15,
                                color: Color(0xFF002147),
                                letterSpacing: -0.2,
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 2),
                            Text(
                              _getRoleText(drive),
                              style: TextStyle(
                                color: Colors.grey[500],
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      // Status badge
                      _buildStatusBadge(userStatus, isEligible),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Info chips row
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      _buildInfoChip(Icons.currency_rupee, _getCtcText(drive)),
                      _buildInfoChip(
                        Icons.location_on_outlined,
                        drive['location'] ?? 'Remote',
                      ),
                    ],
                  ),
                ],
              ),
            ),

            // Footer: Date & Deadline
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: const BorderRadius.vertical(
                  bottom: Radius.circular(14),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.calendar_today_outlined,
                    size: 13,
                    color: Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      Formatters.formatDateOnly(drive['drive_date']),
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontWeight: FontWeight.w500,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Container(
                    width: 1,
                    height: 14,
                    margin: const EdgeInsets.symmetric(horizontal: 10),
                    color: Colors.grey[300],
                  ),
                  Icon(
                    Icons.timer_outlined,
                    size: 13,
                    color: Colors.orange[700],
                  ),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      'Due ${Formatters.timeUntil(drive['deadline_date'])}',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.orange[700],
                        fontWeight: FontWeight.w600,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String? status, bool isEligible) {
    final config = _getStatusConfig(status, isEligible);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: config.color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(
          color: config.color.withValues(alpha: 0.25),
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(config.icon, size: 11, color: config.color),
          const SizedBox(width: 4),
          Text(
            config.label,
            style: TextStyle(
              color: config.color,
              fontSize: 10,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  _StatusConfig _getStatusConfig(String? status, bool isEligible) {
    switch (status) {
      case 'opted_in':
        return _StatusConfig(
          'Applied',
          const Color(0xFF10B981),
          Icons.check_circle_outline,
        );
      case 'opted_out':
        return _StatusConfig(
          'Opted Out',
          const Color(0xFF6B7280),
          Icons.cancel_outlined,
        );
      case 'shortlisted':
        return _StatusConfig(
          'Shortlisted',
          const Color(0xFFF59E0B),
          Icons.star_outline,
        );
      case 'rejected':
        return _StatusConfig('Rejected', const Color(0xFFEF4444), Icons.cancel);
      case 'placed':
        return _StatusConfig('Placed', const Color(0xFF059669), Icons.verified);
      case 'request_to_attend':
        return _StatusConfig(
          'Requested',
          const Color(0xFF002147),
          Icons.pending_outlined,
        );
      default:
        if (isEligible) {
          return _StatusConfig(
            'Eligible',
            const Color(0xFF10B981),
            Icons.check_circle_outline,
          );
        }
        return _StatusConfig(
          'Not Eligible',
          const Color(0xFFEF4444),
          Icons.block,
        );
    }
  }

  Widget _buildInfoChip(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFF002147).withValues(alpha: 0.04),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 14,
            color: const Color(0xFF002147).withValues(alpha: 0.5),
          ),
          const SizedBox(width: 5),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 120),
            child: Text(
              text,
              style: TextStyle(
                color: Colors.grey[700],
                fontSize: 12,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }

  String _getRoleText(Map<String, dynamic> drive) {
    final roles = drive['roles'] as List? ?? [];
    if (roles.isEmpty) return 'No Roles';
    if (roles.length == 1) return roles.first['role_name'] ?? 'Unknown Role';
    return '${roles.length} Roles Available';
  }

  String _getCtcText(Map<String, dynamic> drive) {
    final roles = drive['roles'] as List? ?? [];
    if (roles.isEmpty) return 'Not Disclosed';

    final ctcs = roles
        .map((r) => r['ctc'])
        .where((c) => c != null && c.toString().isNotEmpty)
        .toSet()
        .toList();

    if (ctcs.isEmpty) return 'Not Disclosed';
    if (ctcs.length == 1) return ctcs.first;
    return 'View Details';
  }
}

class _StatusConfig {
  final String label;
  final Color color;
  final IconData icon;
  const _StatusConfig(this.label, this.color, this.icon);
}
