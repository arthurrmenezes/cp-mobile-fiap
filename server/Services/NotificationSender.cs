using FirebaseAdmin.Messaging;

namespace NotificationsApi.Services;

public class NotificationSender
{
    private readonly FirebaseServices _firebase;
    private readonly RecipientResolver _recipientResolver;

    public NotificationSender(FirebaseServices firebase, RecipientResolver recipientResolver)
    {
        _firebase = firebase;
        _recipientResolver = recipientResolver;
    }

    public async Task SendToUsersAsync(
        List<string> recipientUids,
        string conversationId,
        string conversationType,
        string text)
    {
        var body = text.Length > 80 ? text[..80] + "..." : text;

        foreach (var uid in recipientUids)
        {
            var tokens = await _recipientResolver.GetDeviceTokensAsync(uid);

            foreach (var token in tokens)
            {
                var message = new Message
                {
                    Token = token,
                    Notification = new Notification { Title = "Nova mensagem", Body = body },
                    Data = new Dictionary<string, string>
                    {
                        ["conversationId"] = conversationId,
                        ["conversationType"] = conversationType,
                    },
                };

                try
                {
                    await _firebase.Messaging.SendAsync(message);
                }
                catch (FirebaseMessagingException ex) when (
                    ex.MessagingErrorCode == MessagingErrorCode.Unregistered ||
                    ex.MessagingErrorCode == MessagingErrorCode.InvalidArgument)
                {
                    await _recipientResolver.DisableTokenAsync(uid, token);
                }
            }
        }
    }
}
