#!/usr/bin/env python3

import os, time, subprocess

original_dir = "original"
whitelist_suffix = [
    ".jpeg",
    ".jpg",
    ".JPG",
    ".png",
    ".PNG",
]

def main():
    directory = os.fsencode(original_dir)
    for file in os.listdir(directory):
        name = os.fsdecode(file)
        skip = True
        for suffix in whitelist_suffix:
            if name.endswith(suffix):
                valid = False
                break
        if skip:
            continue

        input_file = os.path.join(original_dir, name)
        ct = time.strptime(time.ctime(os.path.getmtime(input_file)))
        output_file = time.strftime("%Y%m%d-%H%M%S", ct)
        meta_file = output_file + ".meta"
        output_file += ".jpg"
        if os.path.exists(output_file):
            continue

        print(input_file, "=>", output_file)
        subprocess.run([
            "ffmpeg", "-loglevel", "16", "-y",
            "-i", input_file, "-vf",
            "scale='min(if(gt(a,1/1),3840,-1),iw)':'min(if(gt(a,1/1),-1,3840),ih)'",
            output_file
        ])
        subprocess.run([
            "exiftool", "-tagsfromfile",
            input_file,
            "-exif",
            "-overwrite_original",
            output_file
        ])
        f = open(meta_file, "w")
        f.write('{ "Title": "", "Rating": 3 }')
        f.close()

if __name__ == "__main__":
    main()
