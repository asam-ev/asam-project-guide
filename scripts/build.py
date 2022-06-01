import os,sys,getopt

def main(argv):
    parameters="sft"
    parameters_long = ["start","finish","test"]

    do_start = False
    do_finish = False
    do_test = False

    try:
        opts, args = getopt.getopt(argv,parameters,parameters_long)
    except:
        print("Optional parameters are: -s, --start, -f, --finish, -t, --test")

    for opt,arg in opts:
        if opt in ("-s","--start"):
            do_start = True

        elif opt in ("-f","--finish"):
            do_finish = True
            do_clean = True

        elif opt in ("-t","--test"):
            do_test = True

    if not (do_start or do_finish):
        do_start = do_finish  = True


    if do_test:
        exit(0)

    if do_start:
        run_docker_compose()

    if do_finish:
        open_project_guide()
        print("BUILD DONE")

def run_docker_compose():
    print("RUN DOCKER-COMPOSE")
    try:
        os.system("docker-compose run antora")
    except:
        try:
            os.chdir("../")
            os.system("docker-compose run antora")
        except:
            pass

def open_project_guide():
    print("OPEN INDEX.HTML")
    try:
        os.chdir("../site")
        os.system("start chrome {pos}".format(pos = os.getcwd()+"/index.html"))
    except:
        try:
            os.system("start chrome {pos}".format(pos = os.getcwd()+"/index.html"))
        except:
            pass

if __name__ == "__main__":
    main(sys.argv[1:])