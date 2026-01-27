import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../utils/constants.dart';
import '../utils/formatters.dart'; // [NEW]
import '../screens/drive_detail_screen.dart';

class DriveCard extends StatelessWidget {
  final Map<String, dynamic> drive;
  final VoidCallback? onRefresh;

  const DriveCard({super.key, required this.drive, this.onRefresh});

  @override
  Widget build(BuildContext context) {
    bool isOptedIn = drive['user_status'] == 'opted_in';
    // isWithdrawn logic preserved from original code if needed,
    // though distinct badging handles most cases.

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
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          // border: Border.all(color: AppConstants.borderColor, width: 0),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child:
                      drive['logo_url'] != null &&
                          drive['logo_url'].toString().isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: AppConstants.sanitizeUrl(drive['logo_url']),
                          placeholder: (context, url) =>
                              Container(color: Colors.grey[200]),
                          errorWidget: (context, url, error) =>
                              const Icon(Icons.business, color: Colors.grey),
                          fit: BoxFit.cover,
                        )
                      : const Icon(Icons.business, color: Colors.grey),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        drive['company_name'] ?? 'Company',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 16,
                        ),
                      ),
                      Text(
                        drive['job_role'] ?? 'Role',
                        style: const TextStyle(
                          color: AppConstants.textSecondary,
                          fontSize: 14,
                        ),
                      ),
                    ],
                  ),
                ),
                if (isOptedIn)
                  _buildBadge(
                    'Applied',
                    AppConstants.successColor,
                    Icons.check_circle_outline,
                  )
                else if (drive['user_status'] == 'opted_out')
                  _buildBadge('Opted Out', Colors.orange, Icons.cancel_outlined)
                else if (drive['user_status'] == 'shortlisted')
                  _buildBadge('Shortlisted', Colors.blue, Icons.star_outline)
                else if (drive['user_status'] == 'rejected')
                  _buildBadge('Rejected', Colors.red, Icons.cancel)
                else if (drive['user_status'] == 'placed')
                  _buildBadge('Placed', Colors.green[800]!, Icons.verified)
                else
                  _buildBadge('Eligible', Colors.blueGrey, Icons.info_outline),
              ],
            ),
            const SizedBox(height: 16),
            _buildInfoRow(
              Icons.currency_rupee,
              drive['ctc_display'] ?? 'Not Disclosed',
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              Icons.location_on_outlined,
              drive['location'] ?? 'Remote',
            ),
            const SizedBox(height: 8), // Spacing
            // [NEW] Drive Date & Deadline
            Row(
              children: [
                Expanded(
                  child: _buildInfoRow(
                    Icons.calendar_today_outlined,
                    'Date: ${Formatters.formatDate(drive['drive_date'])}',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _buildInfoRow(
                    Icons.timer_outlined,
                    'Deadline: ${Formatters.formatDate(drive['deadline_date'])}',
                    color: Colors.orange[800], // Highlight deadline
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBadge(String text, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Row(
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            text,
            style: TextStyle(
              color: color,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text, {Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color ?? AppConstants.textSecondary),
        const SizedBox(width: 8),
        Text(
          text,
          style: TextStyle(
            color: color ?? AppConstants.textSecondary,
            fontSize: 13,
            fontWeight: color != null ? FontWeight.w500 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
