
uniform sampler2D map;

flat in ivec4 v_strengths;
in vec2 v_uv;

void main() {
    vec2 n_uv = (v_uv + vec2(v_strengths.x, 0.0)) / 4.0;
    vec2 e_uv = (v_uv + vec2(v_strengths.y, 1.0)) / 4.0;
    vec2 s_uv = (v_uv + vec2(v_strengths.z, 2.0)) / 4.0;
    vec2 w_uv = (v_uv + vec2(v_strengths.w, 3.0)) / 4.0;
    
    vec4 north = texture2D(map, n_uv);
    vec4 east  = texture2D(map, e_uv);
    vec4 south = texture2D(map, s_uv);
    vec4 west  = texture2D(map, w_uv);

    gl_FragColor = max(north, max(east, max(south, west)));
}
