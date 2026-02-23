import Cocoa
if let img = NSImage(contentsOfFile: "/Users/venessa/Projects/placement-portal-kec-admin/student_app/assets/images/login_image.png"),
   let tiff = img.tiffRepresentation,
   let rep = NSBitmapImageRep(data: tiff) {
    let color = rep.colorAt(x: 0, y: 0)!
    let r = Int(color.redComponent * 255.0)
    let g = Int(color.greenComponent * 255.0)
    let b = Int(color.blueComponent * 255.0)
    print(String(format: "#%02X%02X%02X", r, g, b))
} else { print("Failed") }
