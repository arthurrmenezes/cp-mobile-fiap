using FirebaseAdmin;
using FirebaseAdmin.Auth;
using FirebaseAdmin.Messaging;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;

namespace NotificationsApi.Services;

public class FirebaseServices
{
    public FirebaseAuth Auth { get; }
    public FirestoreDb Firestore { get; }
    public FirebaseMessaging Messaging { get; }
    public RealtimeDatabaseClient RealtimeDatabase { get; }

    public FirebaseServices(IConfiguration configuration)
    {
        var projectId = configuration["Firebase:ProjectId"]!;
        var clientEmail = configuration["Firebase:ClientEmail"]!;
        var privateKey = configuration["Firebase:PrivateKey"]!.Replace("\\n", "\n");
        var databaseUrl = configuration["Firebase:DatabaseUrl"]!;

        var credentialJson = BuildCredentialJson(projectId, clientEmail, privateKey);
        var googleCredential = GoogleCredential.FromJson(credentialJson);

        var app = FirebaseApp.Create(new AppOptions
        {
            Credential = googleCredential,
            ProjectId = projectId,
        });

        Auth = FirebaseAuth.GetAuth(app);
        Messaging = FirebaseMessaging.GetMessaging(app);
        Firestore = new FirestoreDbBuilder { ProjectId = projectId, Credential = googleCredential }.Build();
        RealtimeDatabase = new RealtimeDatabaseClient(databaseUrl, googleCredential);
    }

    private static string BuildCredentialJson(string projectId, string clientEmail, string privateKey)
    {
        var escapedKey = privateKey.Replace("\n", "\\n");
        return $$"""
        {
          "type": "service_account",
          "project_id": "{{projectId}}",
          "private_key": "{{escapedKey}}",
          "client_email": "{{clientEmail}}",
          "token_uri": "https://oauth2.googleapis.com/token"
        }
        """;
    }
}
