using System.Text.Json;
using Google.Apis.Auth.OAuth2;

namespace NotificationsApi.Services;

public class RealtimeDatabaseClient
{
    private static readonly string[] Scopes =
    {
        "https://www.googleapis.com/auth/firebase.database",
        "https://www.googleapis.com/auth/userinfo.email",
    };

    private readonly string _databaseUrl;
    private readonly GoogleCredential _credential;
    private readonly HttpClient _httpClient = new();

    public RealtimeDatabaseClient(string databaseUrl, GoogleCredential credential)
    {
        _databaseUrl = databaseUrl.TrimEnd('/');
        _credential = credential.CreateScoped(Scopes);
    }

    public async Task<JsonElement?> GetAsync(string path)
    {
        var token = await _credential.UnderlyingCredential.GetAccessTokenForRequestAsync();
        var request = new HttpRequestMessage(HttpMethod.Get, $"{_databaseUrl}/{path}.json");
        request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        var response = await _httpClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        var content = await response.Content.ReadAsStringAsync();
        if (content == "null") return null;

        return JsonSerializer.Deserialize<JsonElement>(content);
    }
}
