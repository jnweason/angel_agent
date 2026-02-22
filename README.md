# Angel Agent 🤖

一個輕量級、雙向溝通的即時訊息 PWA 應用程式。使用者可以透過網頁介面接收與發送訊息，並透過 API 與其他系統整合。

## 功能特色

- 📱 **PWA 支援**：可安裝於 iOS 和 Android 桌面，支援離線快取。
- 🔊 **語音互動**：支援語音輸入辨識與訊息朗讀。
- 🔗 **雙向 API**：提供標準 HTTP API，讓外部程式可發送訊息至介面，或讀取使用者在介面上輸入的訊息。
- 🔒 **獨立帳號**：每個使用者擁有獨立的 API Key，確保訊息隔離。

---

## 使用說明

### 1. 安裝與登入
1. 開啟網頁，註冊一個新帳號。
2. 登入後，您會在頂部看到專屬的 **API Key**。
3. 在手機瀏覽器上，可透過「加入主畫面」功能將其安裝為 App。

### 2. 接收訊息
當您想讓外部系統（如 Python 腳本、IoT 設備、其他機器人）發送通知到您的 Angel Agent 介面時：

**API 端點：** `POST /api/send`

**參數：**
- `apiKey` (string): 您的 API Key。
- `message` (string): 要發送的訊息內容。

**範例：**
```bash
curl -X POST https://你的網域/api/send \
  -H "Content-Type: application/json" \
  -d '{"apiKey": "YOUR_API_KEY", "message": "這是一則來自外部程式的通知！"}'

3. 發送訊息
當您在 Angel Agent 介面輸入訊息後，外部系統可以讀取這些訊息來執行指令。

API 端點： GET /api/outbox/YOUR_API_KEY

回應範例：
[
  {
    "id": 1,
    "content": "開燈",
    "created_at": "2023-10-27 12:00:00"
  }
]

部署指南
本專案包含前端與後端，建議分開部署：

後端：部署至 Render.com 或 Vercel (需 Node.js 環境)。
前端：部署至 GitHub Pages。
本地運行
npm install
node server.js
# 開啟瀏覽器訪問 http://localhost:3000

授權
MIT License.
