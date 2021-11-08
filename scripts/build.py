import os

def main():
    reference_macro_replacement()
    # nav_adoc_creation()
    run_docker_compose()
    cleanup()
    open_project_guide()
    print("BUILD DONE")
    os.chdir("../scripts")


def reference_macro_replacement():
    print("CREATE REFERENCES BY ATTRIBUTES")
    try:
        os.system("python create_references_by_attributes.py -p doc/modules")
    except:
        pass

def nav_adoc_creation():
    print("CREATE NAV.ADOC FOR FOLDER")
    try:
        os.system("python create_nav_adoc_for_folder.py -p doc/modules/ROOT/pages/")
    except:
        pass

def run_docker_compose():
    print("RUN DOCKER-COMPOSE")
    try:
        os.system("docker-compose run custom-lunr")
    except:
        try:
            os.chdir("../")
            # print(os.getcwd())
            os.system("docker-compose run custom-lunr")
        except:
            pass


def cleanup():
    print("CLEANUP AFTER BUILD")
    try:
        os.system("python cleanup_after_build.py -p doc/modules")
    except:
        try:
            os.chdir("./scripts")
            # print(os.getcwd())
            os.system("python cleanup_after_build.py -p doc/modules")
        except:
            pass

def open_project_guide():
    print("OPEN INDEX.HTML")
    os.chdir("../site")
    # print(os.getcwd())
    os.system("start chrome {pos}".format(pos = os.getcwd()+"/index.html"))

if __name__ == "__main__":
    main()