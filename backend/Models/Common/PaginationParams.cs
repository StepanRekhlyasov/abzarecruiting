namespace Backend.Api.Models.Common;

public class PaginationParams
{
    private const int DefaultPage = 1;
    private const int DefaultSize = 20;
    private const int MaxSize = 100;

    public int Page { get; init; } = DefaultPage;

    public int Size { get; init; } = DefaultSize;

    public int NormalizedPage => Page < 1 ? DefaultPage : Page;

    public int NormalizedSize
    {
        get
        {
            if (Size < 1)
            {
                return DefaultSize;
            }

            return Size > MaxSize ? MaxSize : Size;
        }
    }

    public int Skip => (NormalizedPage - 1) * NormalizedSize;
}
