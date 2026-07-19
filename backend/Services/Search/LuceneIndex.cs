using System.Linq.Expressions;
using System.Text.RegularExpressions;
using Lucene.Net.Analysis;
using Lucene.Net.Analysis.Standard;
using Lucene.Net.Documents;
using Lucene.Net.Index;
using Lucene.Net.QueryParsers.Classic;
using Lucene.Net.Search;
using Lucene.Net.Store;
using Lucene.Net.Util;
using Microsoft.Extensions.Options;
using Backend.Api.Configuration;
using Directory = System.IO.Directory;

namespace Backend.Api.Services.Search;

public interface ILuceneIndex
{
    void Upsert(string entityType, int id, string content);

    void UpsertMany(string entityType, IEnumerable<(int Id, string Content)> documents);

    void Delete(string entityType, int id);

    void DeleteMany(string entityType, IEnumerable<int> ids);

    IReadOnlyList<int> Search(string entityType, string? query, int maxResults = 2000);

    void Clear();
}

public sealed partial class LuceneIndex : ILuceneIndex, IDisposable
{
    private const LuceneVersion AppLuceneVersion = LuceneVersion.LUCENE_48;
    private const string FieldType = "type";
    private const string FieldId = "id";
    private const string FieldContent = "content";

    private readonly Analyzer _analyzer;
    private readonly FSDirectory _directory;
    private readonly IndexWriter _writer;
    private readonly object _sync = new();

    public LuceneIndex(IOptions<LuceneSettings> options)
    {
        var indexPath = options.Value.IndexPath;
        if (string.IsNullOrWhiteSpace(indexPath))
        {
            indexPath = "lucene-index";
        }

        if (!Path.IsPathRooted(indexPath))
        {
            indexPath = Path.Combine(AppContext.BaseDirectory, indexPath);
        }

        Directory.CreateDirectory(indexPath);

        _analyzer = new StandardAnalyzer(AppLuceneVersion);
        _directory = FSDirectory.Open(indexPath);
        var config = new IndexWriterConfig(AppLuceneVersion, _analyzer)
        {
            OpenMode = OpenMode.CREATE_OR_APPEND,
        };
        _writer = new IndexWriter(_directory, config);
    }

    public void Upsert(string entityType, int id, string content) =>
        UpsertMany(entityType, [(id, content)]);

    public void UpsertMany(string entityType, IEnumerable<(int Id, string Content)> documents)
    {
        var items = documents.Where(item => item.Id > 0).ToList();
        if (items.Count == 0)
        {
            return;
        }

        lock (_sync)
        {
            foreach (var (id, content) in items)
            {
                var docId = ComposeDocId(entityType, id);
                _writer.UpdateDocument(
                    new Term(FieldId, docId),
                    CreateDocument(entityType, id, content ?? string.Empty));
            }

            _writer.Commit();
        }
    }

    public void Delete(string entityType, int id) =>
        DeleteMany(entityType, [id]);

    public void DeleteMany(string entityType, IEnumerable<int> ids)
    {
        var uniqueIds = ids.Where(id => id > 0).Distinct().ToList();
        if (uniqueIds.Count == 0)
        {
            return;
        }

        lock (_sync)
        {
            foreach (var id in uniqueIds)
            {
                _writer.DeleteDocuments(new Term(FieldId, ComposeDocId(entityType, id)));
            }

            _writer.Commit();
        }
    }

    public IReadOnlyList<int> Search(string entityType, string? query, int maxResults = 2000)
    {
        var booleanQueryText = ToBooleanQuery(query);
        if (booleanQueryText is null)
        {
            return [];
        }

        lock (_sync)
        {
            using var reader = _writer.GetReader(applyAllDeletes: true);
            var searcher = new IndexSearcher(reader);
            var parser = new QueryParser(AppLuceneVersion, FieldContent, _analyzer)
            {
                AllowLeadingWildcard = false,
                DefaultOperator = Operator.AND,
            };

            Query contentQuery;
            try
            {
                contentQuery = parser.Parse(booleanQueryText);
            }
            catch (ParseException)
            {
                return [];
            }

            var filter = new BooleanQuery
            {
                { new TermQuery(new Term(FieldType, entityType)), Occur.MUST },
                { contentQuery, Occur.MUST },
            };

            var hits = searcher.Search(filter, maxResults).ScoreDocs;
            var result = new List<int>(hits.Length);
            foreach (var hit in hits)
            {
                var doc = searcher.Doc(hit.Doc);
                if (int.TryParse(doc.Get("entityId"), out var id))
                {
                    result.Add(id);
                }
            }

            return result;
        }
    }

    public void Clear()
    {
        lock (_sync)
        {
            _writer.DeleteAll();
            _writer.Commit();
        }
    }

    public void Dispose()
    {
        lock (_sync)
        {
            _writer.Dispose();
            _directory.Dispose();
            _analyzer.Dispose();
        }
    }

    private static Document CreateDocument(string entityType, int id, string content)
    {
        var docId = ComposeDocId(entityType, id);
        return new Document
        {
            new StringField(FieldId, docId, Field.Store.YES),
            new StringField(FieldType, entityType, Field.Store.YES),
            new StringField("entityId", id.ToString(), Field.Store.YES),
            new TextField(FieldContent, content, Field.Store.NO),
        };
    }

    private static string ComposeDocId(string entityType, int id) => $"{entityType}:{id}";

    public static string? ToBooleanQuery(string? search)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return null;
        }

        var terms = WhitespaceRegex()
            .Split(search.Trim())
            .Select(SanitizeTerm)
            .Where(term => term.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (terms.Count == 0)
        {
            return null;
        }

        return string.Join(' ', terms.Select(term => $"+{QueryParser.Escape(term)}*"));
    }

    private static string SanitizeTerm(string term) =>
        BooleanOperatorsRegex().Replace(term, string.Empty);

    [GeneratedRegex(@"\s+")]
    private static partial Regex WhitespaceRegex();

    [GeneratedRegex(@"[+\-><()~*""@]")]
    private static partial Regex BooleanOperatorsRegex();
}

public static class LuceneQueryExtensions
{
    public static Expression<Func<TEntity, bool>> BuildIdEqualsAny<TEntity>(
        IReadOnlyList<int> ids,
        Expression<Func<TEntity, int>> idSelector)
    {
        if (ids.Count == 0)
        {
            return static _ => false;
        }

        var parameter = idSelector.Parameters[0];
        var property = idSelector.Body;
        Expression? body = null;

        foreach (var id in ids)
        {
            var equals = Expression.Equal(property, Expression.Constant(id));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<TEntity, bool>>(body!, parameter);
    }

    public static Expression<Func<TEntity, bool>> BuildStringEqualsAny<TEntity>(
        IReadOnlyList<string> values,
        Expression<Func<TEntity, string>> selector)
    {
        if (values.Count == 0)
        {
            return static _ => false;
        }

        var parameter = selector.Parameters[0];
        var property = selector.Body;
        Expression? body = null;

        foreach (var value in values)
        {
            var equals = Expression.Equal(property, Expression.Constant(value, typeof(string)));
            body = body is null ? equals : Expression.OrElse(body, equals);
        }

        return Expression.Lambda<Func<TEntity, bool>>(body!, parameter);
    }

    public static IQueryable<TEntity> WhereMatches<TEntity>(
        this IQueryable<TEntity> query,
        ILuceneIndex lucene,
        string entityType,
        string? search,
        Expression<Func<TEntity, int>> idSelector)
    {
        if (string.IsNullOrWhiteSpace(search))
        {
            return query;
        }

        var ids = lucene.Search(entityType, search);
        return query.Where(BuildIdEqualsAny(ids, idSelector));
    }
}
