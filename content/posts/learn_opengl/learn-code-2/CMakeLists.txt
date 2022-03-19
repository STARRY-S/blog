cmake_minimum_required(VERSION 3.0)

project(
    "Learn OpenGL"
    LANGUAGES C
    VERSION 0.1.0
)

set(C_FLAGS "-Wall -lm -ldl -std=c11")
set(CMAKE_C_FLAGS ${C_FLAGS})
set(OpenGL_GL_PREFERENCE LEGACY)

find_package(glfw3 REQUIRED)
find_package(OpenGL REQUIRED)

configure_file(src/vertex.glsl vertex.glsl COPYONLY)
configure_file(src/fragment.glsl fragment.glsl COPYONLY)

include_directories(${OPENGL_INCLUDE_DIR} src)

aux_source_directory("src" GLSRC)
add_executable(main ${GLSRC})
target_link_libraries(main ${OPENGL_gl_LIBRARY} glfw)
