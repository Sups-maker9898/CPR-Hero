import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * CPR HERO - Java Coach Service
 *
 * Answers Coach Pulse questions using public/data/coach.json.
 * Runs alongside the Node.js server (which stays on port 3000).
 *
 * Run from the project folder:
 *   java java/CoachServer.java
 */
public class CoachServer {

    private static final int PORT = 8080;
    private static final int MAX_BODY_BYTES = 4096;
    private static final int MAX_QUESTION_LENGTH = 500;

    private static Map<String, Object> coach;

    public static void main(String[] args) throws IOException {
        Path dataPath = findCoachData(args);
        coach = asMap(new JsonParser(Files.readString(dataPath, StandardCharsets.UTF_8)).parse());

        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", PORT), 0);
        server.createContext("/api/coach/health", CoachServer::handleHealth);
        server.createContext("/api/coach/ask", CoachServer::handleAsk);
        server.start();

        System.out.println();
        System.out.println("CPR HERO Java Coach is running");
        System.out.println("   Coach API: http://localhost:" + PORT + "/api/coach/ask");
        System.out.println("   Data file: " + dataPath.toAbsolutePath());
        System.out.println("   Press Ctrl+C to stop.");
    }

    // --- HTTP handlers ---

    private static void handleHealth(HttpExchange exchange) throws IOException {
        addCors(exchange);
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            send(exchange, 204, "");
            return;
        }
        send(exchange, 200, "{\"status\":\"ok\",\"service\":\"java-coach\"}");
    }

    private static void handleAsk(HttpExchange exchange) throws IOException {
        addCors(exchange);
        String method = exchange.getRequestMethod();

        if ("OPTIONS".equals(method)) {
            send(exchange, 204, "");
            return;
        }
        if (!"POST".equals(method)) {
            send(exchange, 405, "{\"error\":\"Use POST\"}");
            return;
        }

        String body = readBody(exchange.getRequestBody());
        if (body == null) {
            send(exchange, 413, "{\"error\":\"Request too large\"}");
            return;
        }

        String question;
        try {
            Object parsed = new JsonParser(body).parse();
            question = str(asMap(parsed).get("question"));
        } catch (RuntimeException e) {
            send(exchange, 400, "{\"error\":\"Invalid JSON\"}");
            return;
        }

        if (question.length() > MAX_QUESTION_LENGTH) {
            question = question.substring(0, MAX_QUESTION_LENGTH);
        }

        String answer = findAnswer(question);
        send(exchange, 200, "{\"answer\":" + toJsonString(answer) + ",\"source\":\"java\"}");
    }

    // --- Coach logic (same matching rules as public/js/coach.js) ---

    private static String findAnswer(String question) {
        String q = question.toLowerCase(Locale.ROOT).trim();
        if (q.isEmpty()) return str(coach.get("emptyPrompt"));

        Map<String, Object> best = null;
        int bestScore = 0;

        for (Object item : asList(coach.get("knowledge"))) {
            Map<String, Object> entry = asMap(item);
            int score = 0;
            for (Object key : asList(entry.get("keys"))) {
                String k = str(key);
                if (!k.isEmpty() && q.contains(k)) score += k.length();
            }
            if (score > bestScore) {
                bestScore = score;
                best = entry;
            }
        }

        if (best != null) return resolveAnswer(best);
        return str(coach.get("fallback"));
    }

    private static String resolveAnswer(Map<String, Object> entry) {
        String extra = str(entry.get("extra"));
        Object answerKey = entry.get("answerKey");
        if (answerKey != null) {
            return str(asMap(coach.get("topics")).get(str(answerKey))) + extra;
        }
        return str(entry.get("answer")) + extra;
    }

    // --- Helpers ---

    private static Path findCoachData(String[] args) {
        List<Path> candidates = new ArrayList<>();
        if (args.length > 0) candidates.add(Path.of(args[0]));
        candidates.add(Path.of("public", "data", "coach.json"));
        candidates.add(Path.of("..", "public", "data", "coach.json"));

        for (Path p : candidates) {
            if (Files.isRegularFile(p)) return p;
        }
        throw new IllegalStateException("coach.json not found. Run this from the project folder.");
    }

    private static void addCors(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static String readBody(InputStream in) throws IOException {
        byte[] data = in.readNBytes(MAX_BODY_BYTES + 1);
        if (data.length > MAX_BODY_BYTES) return null;
        return new String(data, StandardCharsets.UTF_8);
    }

    private static void send(HttpExchange exchange, int status, String json) throws IOException {
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        if (status == 204) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = exchange.getResponseBody()) {
            out.write(bytes);
        }
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object value) {
        return value instanceof Map ? (Map<String, Object>) value : Collections.emptyMap();
    }

    @SuppressWarnings("unchecked")
    private static List<Object> asList(Object value) {
        return value instanceof List ? (List<Object>) value : Collections.emptyList();
    }

    private static String str(Object value) {
        return value instanceof String ? (String) value : "";
    }

    private static String toJsonString(String value) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : value.toCharArray()) {
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c));
                    else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    /** Minimal JSON reader: objects, arrays, strings, numbers, true/false/null. */
    private static final class JsonParser {
        private final String src;
        private int pos;

        JsonParser(String src) {
            this.src = src;
        }

        Object parse() {
            Object value = readValue();
            skipWhitespace();
            if (pos != src.length()) throw error("Unexpected trailing content");
            return value;
        }

        private Object readValue() {
            skipWhitespace();
            if (pos >= src.length()) throw error("Unexpected end of JSON");
            char c = src.charAt(pos);
            switch (c) {
                case '{': return readObject();
                case '[': return readArray();
                case '"': return readString();
                case 't': expect("true"); return Boolean.TRUE;
                case 'f': expect("false"); return Boolean.FALSE;
                case 'n': expect("null"); return null;
                default: return readNumber();
            }
        }

        private Map<String, Object> readObject() {
            Map<String, Object> map = new LinkedHashMap<>();
            pos++;
            skipWhitespace();
            if (peek('}')) { pos++; return map; }
            while (true) {
                skipWhitespace();
                String key = readString();
                skipWhitespace();
                consume(':');
                map.put(key, readValue());
                skipWhitespace();
                if (peek(',')) { pos++; continue; }
                consume('}');
                return map;
            }
        }

        private List<Object> readArray() {
            List<Object> list = new ArrayList<>();
            pos++;
            skipWhitespace();
            if (peek(']')) { pos++; return list; }
            while (true) {
                list.add(readValue());
                skipWhitespace();
                if (peek(',')) { pos++; continue; }
                consume(']');
                return list;
            }
        }

        private String readString() {
            consume('"');
            StringBuilder sb = new StringBuilder();
            while (pos < src.length()) {
                char c = src.charAt(pos++);
                if (c == '"') return sb.toString();
                if (c != '\\') { sb.append(c); continue; }
                if (pos >= src.length()) break;
                char esc = src.charAt(pos++);
                switch (esc) {
                    case '"': sb.append('"'); break;
                    case '\\': sb.append('\\'); break;
                    case '/': sb.append('/'); break;
                    case 'b': sb.append('\b'); break;
                    case 'f': sb.append('\f'); break;
                    case 'n': sb.append('\n'); break;
                    case 'r': sb.append('\r'); break;
                    case 't': sb.append('\t'); break;
                    case 'u':
                        if (pos + 4 > src.length()) throw error("Bad unicode escape");
                        sb.append((char) Integer.parseInt(src.substring(pos, pos + 4), 16));
                        pos += 4;
                        break;
                    default: throw error("Bad escape");
                }
            }
            throw error("Unterminated string");
        }

        private Double readNumber() {
            int start = pos;
            while (pos < src.length() && "+-0123456789.eE".indexOf(src.charAt(pos)) >= 0) pos++;
            if (start == pos) throw error("Unexpected character");
            return Double.parseDouble(src.substring(start, pos));
        }

        private void expect(String word) {
            if (!src.startsWith(word, pos)) throw error("Expected " + word);
            pos += word.length();
        }

        private void consume(char c) {
            skipWhitespace();
            if (!peek(c)) throw error("Expected '" + c + "'");
            pos++;
        }

        private boolean peek(char c) {
            return pos < src.length() && src.charAt(pos) == c;
        }

        private void skipWhitespace() {
            while (pos < src.length() && Character.isWhitespace(src.charAt(pos))) pos++;
        }

        private IllegalArgumentException error(String message) {
            return new IllegalArgumentException(message + " at position " + pos);
        }
    }
}
