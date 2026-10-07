"""Telegram notification service for Vikāsa alerts."""

import asyncio
import logging
from typing import Optional
from dataclasses import dataclass
from backend.app.config import config

logger = logging.getLogger(__name__)


@dataclass
class TelegramConfig:
    """Telegram configuration."""
    bot_token: str
    chat_id: str


class TelegramService:
    """Telegram notification service for sending alerts."""
    
    def __init__(self):
        self._bot_token: Optional[str] = None
        self._chat_id: Optional[str] = None
        self._initialized = False
    
    def initialize(self) -> bool:
        """Initialize Telegram service from config.
        
        Returns:
            True if initialized successfully, False if not configured.
        """
        if not config.telegram_bot_token or not config.telegram_chat_id:
            logger.info("Telegram not configured - alerts will not be sent")
            return False
        
        self._bot_token = config.telegram_bot_token
        self._chat_id = config.telegram_chat_id
        self._initialized = True
        logger.info("Telegram service initialized")
        return True
    
    async def send_alert(self, message: str) -> bool:
        """Send an alert message via Telegram.
        
        Args:
            message: The alert message to send.
            
        Returns:
            True if sent successfully, False otherwise.
        """
        if not self._initialized:
            logger.warning("Telegram not initialized - cannot send alert")
            return False
        
        try:
            import aiohttp
            url = f"https://api.telegram.org/bot{self._bot_token}/sendMessage"
            payload = {
                "chat_id": self._chat_id,
                "text": message,
                "parse_mode": "HTML"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        logger.info("Telegram alert sent successfully")
                        return True
                    else:
                        text = await response.text()
                        logger.error(f"Failed to send Telegram alert: {response.status} - {text}")
                        return False
                        
        except ImportError:
            logger.error("aiohttp not installed - cannot send Telegram alerts")
            return False
        except Exception as e:
            logger.error(f"Failed to send Telegram alert: {e}")
            return False
    
    async def send_sensor_alert(self, plant_id: str, reading_id: str, 
                                 alert_type: str, message: str) -> bool:
        """Send a formatted sensor alert.
        
        Args:
            plant_id: Plant identifier
            reading_id: Reading identifier
            alert_type: Type of alert (threshold, connectivity, calibration, data_quality)
            message: Alert message
            
        Returns:
            True if sent successfully
        """
        alert_message = (
            f"🚨 <b>Vikāsa Alert</b>\n\n"
            f"<b>Type:</b> {alert_type}\n"
            f"<b>Plant:</b> {plant_id}\n"
            f"<b>Reading:</b> {reading_id}\n"
            f"<b>Message:</b> {message}"
        )
        return await self.send_alert(alert_message)


# Global instance
telegram_service = None


def get_telegram_service() -> Optional[TelegramService]:
    """Get or create the global Telegram service instance."""
    global telegram_service
    if telegram_service is None:
        telegram_service = TelegramService()
        telegram_service.initialize()
    return telegram_service