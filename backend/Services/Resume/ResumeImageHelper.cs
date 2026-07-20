namespace Backend.Api.Services.Resume;

public static class ResumeImageHelper
{
    public static bool IsSupportedImage(ReadOnlySpan<byte> bytes)
    {
        if (bytes.Length < 12)
        {
            return false;
        }

        if (bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
        {
            return true;
        }

        if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
        {
            return true;
        }

        return bytes[0] == 0x52
               && bytes[1] == 0x49
               && bytes[2] == 0x46
               && bytes[3] == 0x46
               && bytes[8] == 0x57
               && bytes[9] == 0x45
               && bytes[10] == 0x42
               && bytes[11] == 0x50;
    }

    public static string ToPdfCompatiblePhotoUrl(string url)
    {
        const string uploadSegment = "/image/upload/";
        var index = url.IndexOf(uploadSegment, StringComparison.OrdinalIgnoreCase);
        if (index < 0)
        {
            return url;
        }

        var afterUpload = index + uploadSegment.Length;
        var remainder = url[afterUpload..];
        if (remainder.StartsWith("f_png/", StringComparison.OrdinalIgnoreCase)
            || remainder.StartsWith("f_jpg/", StringComparison.OrdinalIgnoreCase)
            || remainder.StartsWith("f_jpeg/", StringComparison.OrdinalIgnoreCase)
            || remainder.StartsWith("f_webp/", StringComparison.OrdinalIgnoreCase))
        {
            return url;
        }

        return url.Insert(afterUpload, "f_png/");
    }
}
