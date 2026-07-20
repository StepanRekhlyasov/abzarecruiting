using QuestPDF.Infrastructure;
using ZXing;
using ZXing.QrCode;
using ZXing.Rendering;

namespace Backend.Api.Services.Resume;

public static class ResumeQrCodeGenerator
{
    public static string GenerateSvg(string url, Size size)
    {
        var writer = new QRCodeWriter();
        var qrCode = writer.encode(url, BarcodeFormat.QR_CODE, (int)size.Width, (int)size.Height);
        var renderer = new SvgRenderer();
        return renderer.Render(qrCode, BarcodeFormat.QR_CODE, null).Content;
    }
}
