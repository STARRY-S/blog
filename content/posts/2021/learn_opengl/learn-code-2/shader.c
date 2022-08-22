#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "shader.h"

const static int LINE_LENGTH = 512;

GLuint make_shader(GLenum type, const char *const shader_src)
{
        GLuint shader = 0;
        GLint compiled = 0;

        if (!(shader = glCreateShader(type))) {
                fprintf(stderr, "Shader Create Error.\n");
                return 0;
        }

        glShaderSource(shader, 1, &shader_src, NULL);
        glCompileShader(shader);
        glGetShaderiv(shader, GL_COMPILE_STATUS, &compiled);
        if (!compiled) {
                fprintf(stderr, "Shader Compile Error.\n");
                return 0;
        }
        return shader;
}

GLuint load_shader(GLenum type, const char *const shader_path)
{
        GLuint result = 0;
        FILE *fp = NULL;
        size_t file_length = 0;
        char *file_content = NULL;
        char temp_line[LINE_LENGTH];

        if (!(fp = fopen(shader_path, "r"))) {
                fprintf(stderr, "Open file %s failed.\n", shader_path);
                return 1;
        }
        // sets the file position to end of file
        fseek(fp, 0l, SEEK_END);
        file_length = ftell(fp);
        rewind(fp);
        if (!(file_content = (char*) malloc(file_length))) {
                fprintf(stderr, "Malloc Error.\n");
                fclose(fp);
                return 1;
        }
        file_content[0] = '\0';
        while (fgets(temp_line, LINE_LENGTH, fp))
        strncat(file_content, temp_line, LINE_LENGTH);
        fclose(fp);
        result = make_shader(type, file_content);
        free(file_content);
        return result;
}

GLuint load_program(const char *const vshader_path,
                    const char *const fshader_path)
{
        GLint linked = 0;
        GLuint vshader = 0;
        GLuint fshader = 0;
        GLuint program = 0;

        vshader = load_shader(GL_VERTEX_SHADER, vshader_path);
        fshader = load_shader(GL_FRAGMENT_SHADER, fshader_path);
        if (!vshader || !fshader)
                return 0;
        if (!(program = glCreateProgram())) {
                fprintf(stderr, "Program create error.\n");
                return 0;
        }

        glAttachShader(program, vshader);
        glAttachShader(program, fshader);
        glLinkProgram(program);
        glDeleteShader(vshader);
        glDeleteShader(fshader);

        glGetProgramiv(program, GL_LINK_STATUS, &linked);
        if (!linked) {
                fprintf(stderr, "Link Program Error.\n");
                return 0;
        }
        return program;
}
