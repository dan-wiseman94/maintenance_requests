using System.Linq.Expressions;

public static class QueryableExtensions
{
    public static IQueryable<T> OrderByDirection<T, TKey, TTie>(
        this IQueryable<T> source,
        Expression<Func<T, TKey>> key,
        bool desc,
        Expression<Func<T, TTie>> tieBreaker)
        => desc
            ? source.OrderByDescending(key).ThenByDescending(tieBreaker)
            : source.OrderBy(key).ThenBy(tieBreaker);
}
