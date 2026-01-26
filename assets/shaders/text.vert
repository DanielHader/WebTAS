uniform vec2 viewport;
uniform float fieldRange;

// glyph space attributes
in vec2 atlasOffset;
in vec2 atlasSize;
in vec2 glyphOrigin;
in vec2 glyphUp;
in vec2 glyphRight;
in vec2 glyphOffset;
in vec3 glyphColor;
in float glyphSize;

out vec2 texCoords;
out vec3 color;
out float screenFieldRange;

void main() {
    texCoords = uv * atlasSize + atlasOffset;
    color = glyphColor;
    screenFieldRange = glyphSize * projectionMatrix[1][1] * viewport.y * fieldRange / 2.0;
    
    vec2 glyphPosition = position.x * glyphRight + position.y * glyphUp + glyphOrigin + glyphOffset;
    gl_Position = projectionMatrix * viewMatrix * vec4(glyphPosition, 0.0, 1.0);
}
