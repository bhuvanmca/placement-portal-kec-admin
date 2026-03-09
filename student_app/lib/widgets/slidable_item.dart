import 'package:flutter/material.dart';

class SlidableItem extends StatefulWidget {
  final Widget child;
  final VoidCallback onDelete;
  final String deleteLabel;
  final double actionWidth;

  const SlidableItem({
    super.key,
    required this.child,
    required this.onDelete,
    this.deleteLabel = 'Delete',
    this.actionWidth = 80,
  });

  @override
  State<SlidableItem> createState() => _SlidableItemState();
}

class _SlidableItemState extends State<SlidableItem>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  double _dragOffset = 0;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onHorizontalDragUpdate(DragUpdateDetails details) {
    setState(() {
      _dragOffset += details.primaryDelta!;
      if (_dragOffset > 0) _dragOffset = 0;
      if (_dragOffset < -widget.actionWidth * 1.2) {
        _dragOffset = -widget.actionWidth * 1.2;
      }
    });
  }

  void _onHorizontalDragEnd(DragEndDetails details) {
    if (_dragOffset < -widget.actionWidth / 2) {
      _open();
    } else {
      _close();
    }
  }

  void _open() {
    setState(() {
      _dragOffset = -widget.actionWidth;
    });
  }

  void _close() {
    setState(() {
      _dragOffset = 0;
    });
  }

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(12),
      child: Stack(
        children: [
          Positioned.fill(
            child: Container(
              alignment: Alignment.centerRight,
              color: Colors.red,
              child: InkWell(
                onTap: () {
                  _close();
                  widget.onDelete();
                },
                child: SizedBox(
                  width: widget.actionWidth,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.delete_outline, color: Colors.white),
                      const SizedBox(height: 4),
                      Text(
                        widget.deleteLabel,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          GestureDetector(
            onHorizontalDragUpdate: _onHorizontalDragUpdate,
            onHorizontalDragEnd: _onHorizontalDragEnd,
            onTap: _dragOffset != 0 ? _close : null,
            child: Transform.translate(
              offset: Offset(_dragOffset, 0),
              child: widget.child,
            ),
          ),
        ],
      ),
    );
  }
}
