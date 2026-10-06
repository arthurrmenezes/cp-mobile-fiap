using System.Text.Json;
using Google.Cloud.Firestore;
using NotificationsApi.Models;

namespace NotificationsApi.Services;

public class RecipientResolver
{
    private readonly FirebaseServices _firebase;

    public RecipientResolver(FirebaseServices firebase)
    {
        _firebase = firebase;
    }

    public async Task<ChatMessage?> LoadMessageAsync(string conversationId, string messageId)
    {
        var json = await _firebase.RealtimeDatabase.GetAsync($"messages/{conversationId}/{messageId}");
        if (json is null) return null;

        var element = json.Value;

        var target = new MessageTarget { Type = "conversation" };
        if (element.TryGetProperty("target", out var targetElement))
        {
            target.Type = targetElement.GetProperty("type").GetString() ?? "conversation";
            if (targetElement.TryGetProperty("memberId", out var memberId))
            {
                target.MemberId = memberId.GetString();
            }
        }

        var mentioned = new List<string>();
        if (element.TryGetProperty("mentionedUserIds", out var mentionedElement) &&
            mentionedElement.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in mentionedElement.EnumerateArray())
            {
                var value = item.GetString();
                if (value is not null) mentioned.Add(value);
            }
        }

        return new ChatMessage
        {
            SenderId = element.GetProperty("senderId").GetString() ?? "",
            Text = element.GetProperty("text").GetString() ?? "",
            ConversationType = element.GetProperty("conversationType").GetString() ?? "direct",
            Target = target,
            MentionedUserIds = mentioned,
        };
    }

    public async Task<List<string>> ResolveRecipientsAsync(string conversationId, ChatMessage message)
    {
        if (message.ConversationType == "direct")
        {
            var snapshot = await _firebase.Firestore.Collection("directConversations").Document(conversationId).GetSnapshotAsync();
            if (!snapshot.Exists) return new List<string>();

            var participants = snapshot.GetValue<List<string>>("participants");
            return participants.Where(uid => uid != message.SenderId).ToList();
        }

        var groupSnapshot = await _firebase.Firestore.Collection("groups").Document(conversationId).GetSnapshotAsync();
        if (!groupSnapshot.Exists) return new List<string>();

        var memberIds = groupSnapshot.GetValue<List<string>>("memberIds");
        var notificationPolicy = groupSnapshot.GetValue<string>("notificationPolicy");
        var otherMembers = memberIds.Where(uid => uid != message.SenderId).ToList();

        return notificationPolicy switch
        {
            "all_group_messages" => otherMembers,
            "mentioned_members" => ResolveMentioned(message),
            _ => new List<string>(),
        };
    }

    private static List<string> ResolveMentioned(ChatMessage message)
    {
        var targeted = message.Target.Type == "member" && message.Target.MemberId is not null
            ? new List<string> { message.Target.MemberId }
            : new List<string>();

        return targeted.Concat(message.MentionedUserIds)
            .Distinct()
            .Where(uid => uid != message.SenderId)
            .ToList();
    }

    public async Task<List<string>> GetDeviceTokensAsync(string uid)
    {
        var devices = await _firebase.Firestore.Collection("users").Document(uid).Collection("devices").GetSnapshotAsync();

        return devices.Documents
            .Select(doc => doc.ConvertTo<DeviceToken>())
            .Where(device => device.Enabled)
            .Select(device => device.Token)
            .ToList();
    }

    public async Task DisableTokenAsync(string uid, string token)
    {
        await _firebase.Firestore.Collection("users").Document(uid).Collection("devices").Document(token)
            .UpdateAsync("enabled", false);
    }
}
