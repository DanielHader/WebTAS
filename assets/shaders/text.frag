precision highp float;

uniform sampler2D map;

in vec2 texCoords;
in vec3 color;
in float screenFieldRange;

float median(vec4 v) {
    return max(min(v.r, v.g), min(max(v.r, v.g), v.b));
}

void main() {
    vec4 mtsdf = texture2D(map, texCoords);
    float signDist = median(mtsdf);
    float pxDist = screenFieldRange * (signDist - 0.5);
    float alpha = clamp(pxDist + 0.5, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
}
