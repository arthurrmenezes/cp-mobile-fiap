using FirebaseAdmin.Auth;
using NotificationsApi.Models;
using NotificationsApi.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<FirebaseServices>();
builder.Services.AddSingleton<RecipientResolver>();
builder.Services.AddSingleton<NotificationSender>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapPost("/notifications/messages", async (
    HttpRequest request,
    NotifyRequest body,
    FirebaseServices firebase,
    RecipientResolver recipientResolver,
    NotificationSender notificationSender) =>
{
    var token = GetBearerToken(request);
    if (token is null) return Results.Json(new { error = "Token não informado" }, statusCode: 401);

    FirebaseToken decodedToken;
    try
    {
        decodedToken = await firebase.Auth.VerifyIdTokenAsync(token);
    }
    catch (Exception)
    {
        return Results.Json(new { error = "Token inválido" }, statusCode: 401);
    }

    if (string.IsNullOrEmpty(body.ConversationId) || string.IsNullOrEmpty(body.MessageId))
    {
        return Results.Json(new { error = "conversationId e messageId são obrigatórios" }, statusCode: 400);
    }

    var message = await recipientResolver.LoadMessageAsync(body.ConversationId, body.MessageId);
    if (message is null)
    {
        return Results.Json(new { error = "Mensagem não encontrada" }, statusCode: 404);
    }

    if (message.SenderId != decodedToken.Uid)
    {
        return Results.Json(new { error = "Remetente não corresponde ao usuário autenticado" }, statusCode: 403);
    }

    var dedupRef = firebase.Firestore.Collection("sentNotifications").Document(body.MessageId);
    var alreadySent = await firebase.Firestore.RunTransactionAsync(async transaction =>
    {
        var snapshot = await transaction.GetSnapshotAsync(dedupRef);
        if (snapshot.Exists) return true;

        transaction.Set(dedupRef, new Dictionary<string, object>
        {
            ["conversationId"] = body.ConversationId,
            ["createdAt"] = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
        });
        return false;
    });

    if (alreadySent)
    {
        return Results.Ok(new { message = "Notificação já enviada anteriormente" });
    }

    var recipients = await recipientResolver.ResolveRecipientsAsync(body.ConversationId, message);
    await notificationSender.SendToUsersAsync(recipients, body.ConversationId, message.ConversationType, message.Text);

    return Results.Ok(new { message = "Notificações enviadas", recipients = recipients.Count });
});

app.Run();

static string? GetBearerToken(HttpRequest request)
{
    var header = request.Headers.Authorization.ToString();
    if (string.IsNullOrEmpty(header) || !header.StartsWith("Bearer ")) return null;

    var token = header["Bearer ".Length..].Trim();
    return token.Length > 0 ? token : null;
}
