using Google.Cloud.Firestore;

namespace NotificationsApi.Models;

public class MessageTarget
{
    public string Type { get; set; } = "conversation";
    public string? MemberId { get; set; }
}

public class ChatMessage
{
    public string SenderId { get; set; } = "";
    public string Text { get; set; } = "";
    public string ConversationType { get; set; } = "direct";
    public MessageTarget Target { get; set; } = new();
    public List<string> MentionedUserIds { get; set; } = new();
}

public class ChatGroup
{
    public List<string> MemberIds { get; set; } = new();
    public string NotificationPolicy { get; set; } = "all_group_messages";
}

public class DirectConversation
{
    public List<string> Participants { get; set; } = new();
}

[FirestoreData]
public class DeviceToken
{
    [FirestoreProperty("token")]
    public string Token { get; set; } = "";

    [FirestoreProperty("enabled")]
    public bool Enabled { get; set; }
}

public class NotifyRequest
{
    public string ConversationId { get; set; } = "";
    public string MessageId { get; set; } = "";
}
