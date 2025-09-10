from typing import Dict


class ChatMessage:
    """聊天消息类"""

    def __init__(self, role: str, content: str):
        """
        初始化聊天消息
        Args:
            role: 角色（user/assistant/system）
            content: 消息内容
        """
        self.role = role
        self.content = content

    def to_dict(self) -> Dict[str, str]:
        """转换为字典格式"""
        return {
            "role": self.role,
            "content": self.content
        }
