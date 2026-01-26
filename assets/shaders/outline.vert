
in vec3 offset;
in ivec4 strengths;

flat out ivec4 v_strengths;
out vec2 v_uv;

void main() {
    v_uv = uv;
    v_strengths = strengths;

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position + offset, 1.0);
}
